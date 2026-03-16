import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Search, Info } from 'lucide-react';

export interface ReasonCode {
  id: number;
  code: string;
  name: string;
  description?: string;
  reasonCategoryKey: string;
  isActive: boolean;
}

export interface ReasonCodeSelectorProps {
  context: 'order-block' | 'item-rejection' | 'discount' | 'general';
  value?: string;
  onChange: (reasonCode: string | undefined) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showSearch?: boolean;
  error?: string;
}

const REASON_CATEGORY_MAP = {
  'order-block': 'A',
  'item-rejection': 'B', 
  'discount': 'C',
  'general': 'D'
} as const;

const CATEGORY_LABELS = {
  'A': 'Order Block',
  'B': 'Item Rejection',
  'C': 'Discount',
  'D': 'General'
} as const;

export default function ReasonCodeSelector({
  context,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "Select reason code...",
  className = "",
  showSearch = true,
  error
}: ReasonCodeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch reason codes
  const { data: reasonCodes = [], isLoading, error: fetchError } = useQuery({
    queryKey: ['/api/master-data/reason-codes'],
    queryFn: async () => {
      const response = await apiRequest('/api/master-data/reason-codes');
      return Array.isArray(response) ? response : [];
    }
  });

  // Filter reason codes based on context and search term
  const filteredReasonCodes = useMemo(() => {
    const categoryKey = REASON_CATEGORY_MAP[context];
    let filtered = reasonCodes.filter((code: ReasonCode) => 
      code.isActive && code.reasonCategoryKey === categoryKey
    );

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((code: ReasonCode) =>
        code.code.toLowerCase().includes(search) ||
        code.name.toLowerCase().includes(search) ||
        (code.description && code.description.toLowerCase().includes(search))
      );
    }

    return filtered;
  }, [reasonCodes, context, searchTerm]);

  // Get selected reason code details
  const selectedReasonCode = useMemo(() => {
    return reasonCodes.find((code: ReasonCode) => code.code === value);
  }, [reasonCodes, value]);

  // Handle selection change
  const handleValueChange = (selectedValue: string) => {
    if (selectedValue === '') {
      onChange(undefined);
    } else {
      onChange(selectedValue);
    }
    setIsOpen(false);
  };

  // Clear search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  if (fetchError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load reason codes. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor="reason-code-select">
          Reason Code {required && <span className="text-red-500">*</span>}
        </Label>
        {selectedReasonCode && (
          <Badge variant="outline" className="text-xs">
            {CATEGORY_LABELS[selectedReasonCode.reasonCategoryKey as keyof typeof CATEGORY_LABELS]}
          </Badge>
        )}
      </div>

      <Select
        value={value || ''}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger 
          id="reason-code-select"
          className={error ? 'border-red-500' : ''}
        >
          <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {showSearch && (
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reason codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          )}

          {filteredReasonCodes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchTerm ? 'No reason codes found matching your search.' : 'No reason codes available for this context.'}
            </div>
          ) : (
            filteredReasonCodes.map((reasonCode: ReasonCode) => (
              <SelectItem key={reasonCode.id} value={reasonCode.code}>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-medium">
                      {reasonCode.code}
                    </span>
                    <span className="text-sm">{reasonCode.name}</span>
                  </div>
                  {reasonCode.description && (
                    <span className="text-xs text-muted-foreground">
                      {reasonCode.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedReasonCode && selectedReasonCode.description && (
        <div className="flex items-start space-x-2 p-2 bg-muted rounded-md">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <strong>{selectedReasonCode.name}:</strong> {selectedReasonCode.description}
          </div>
        </div>
      )}

      {required && !value && (
        <div className="text-sm text-muted-foreground">
          A reason code is required for this action.
        </div>
      )}
    </div>
  );
}

// Helper hook for using reason codes in forms
export function useReasonCodes(context: ReasonCodeSelectorProps['context']) {
  const { data: reasonCodes = [], isLoading, error } = useQuery({
    queryKey: ['/api/master-data/reason-codes'],
    queryFn: async () => {
      const response = await apiRequest('/api/master-data/reason-codes');
      return Array.isArray(response) ? response : [];
    }
  });

  const contextReasonCodes = useMemo(() => {
    const categoryKey = REASON_CATEGORY_MAP[context];
    return reasonCodes.filter((code: ReasonCode) => 
      code.isActive && code.reasonCategoryKey === categoryKey
    );
  }, [reasonCodes, context]);

  return {
    reasonCodes: contextReasonCodes,
    isLoading,
    error
  };
}
