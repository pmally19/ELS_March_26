import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Ship, Truck, CheckCircle, AlertCircle } from "lucide-react";

type Incoterms = {
  id: number;
  incotermsKey: string;
  description: string;
  category: string;
  applicableVersion: string;
  riskTransferPoint?: string;
  costResponsibility?: string;
  applicableTransport?: string;
  isActive: boolean;
};

type IncotermsProposal = {
  incotermsKey: string;
  incotermsLocation: string;
  isDefaulted: boolean;
  source: string;
};

type IncotermsSelectorProps = {
  salesOrderId?: number;
  customerId?: number;
  onIncotermsChange?: (incoterms: { incotermsKey: string; incotermsLocation: string }) => void;
  initialIncoterms?: {
    incotermsKey: string;
    incotermsLocation: string;
  };
};

export default function IncotermsSelector({ 
  salesOrderId, 
  customerId, 
  onIncotermsChange,
  initialIncoterms 
}: IncotermsSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [incotermsKey, setIncotermsKey] = useState(initialIncoterms?.incotermsKey || "");
  const [incotermsLocation, setIncotermsLocation] = useState(initialIncoterms?.incotermsLocation || "");
  const [isUserOverride, setIsUserOverride] = useState(false);
  const [proposal, setProposal] = useState<IncotermsProposal | null>(null);

  // Fetch all incoterms
  const { data: incoterms = [], isLoading } = useQuery<Incoterms[]>({
    queryKey: ["/api/sales-distribution/incoterms"],
    queryFn: async () => {
      const res = await apiRequest("/api/sales-distribution/incoterms");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch customer proposal
  const { data: customerProposal } = useQuery<IncotermsProposal>({
    queryKey: ["/api/sales-distribution/incoterms/customer", customerId, "propose"],
    queryFn: async () => {
      if (!customerId) return null;
      const res = await apiRequest(`/api/sales-distribution/incoterms/customer/${customerId}/propose`);
      const data = await res.json();
      return data;
    },
    enabled: !!customerId
  });

  // Fetch existing sales order incoterms
  const { data: existingIncoterms = [] } = useQuery({
    queryKey: ["/api/sales-distribution/incoterms/sales-order", salesOrderId],
    queryFn: async () => {
      if (!salesOrderId) return [];
      const res = await apiRequest(`/api/sales-distribution/incoterms/sales-order/${salesOrderId}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!salesOrderId
  });

  // Save incoterms mutation
  const saveIncotermsMutation = useMutation({
    mutationFn: async (payload: { 
      incotermsKey: string; 
      incotermsLocation: string; 
      isDefaulted: boolean; 
      isUserOverride: boolean; 
    }) => {
      if (!salesOrderId) {
        throw new Error("Sales order ID is required");
      }
      const res = await apiRequest(`/api/sales-distribution/incoterms/sales-order/${salesOrderId}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Incoterms updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/incoterms/sales-order", salesOrderId] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "Failed to save incoterms", variant: "destructive" });
    }
  });

  // Auto-propose incoterms when customer changes
  useEffect(() => {
    if (customerProposal && !isUserOverride) {
      setProposal(customerProposal);
      setIncotermsKey(customerProposal.incotermsKey);
      setIncotermsLocation(customerProposal.incotermsLocation);
      onIncotermsChange?.({
        incotermsKey: customerProposal.incotermsKey,
        incotermsLocation: customerProposal.incotermsLocation
      });
    }
  }, [customerProposal, isUserOverride, onIncotermsChange]);

  // Load existing incoterms
  useEffect(() => {
    if (existingIncoterms.length > 0) {
      const existing = existingIncoterms[0];
      setIncotermsKey(existing.incotermsKey);
      setIncotermsLocation(existing.incotermsLocation);
      setIsUserOverride(existing.isUserOverride);
      onIncotermsChange?.({
        incotermsKey: existing.incotermsKey,
        incotermsLocation: existing.incotermsLocation
      });
    }
  }, [existingIncoterms, onIncotermsChange]);

  const handleIncotermsKeyChange = (value: string) => {
    setIncotermsKey(value);
    setIsUserOverride(true);
    onIncotermsChange?.({
      incotermsKey: value,
      incotermsLocation
    });
  };

  const handleLocationChange = (value: string) => {
    setIncotermsLocation(value);
    setIsUserOverride(true);
    onIncotermsChange?.({
      incotermsKey,
      incotermsLocation: value
    });
  };

  const handleSave = () => {
    if (!incotermsKey || !incotermsLocation) {
      toast({ title: "Validation Error", description: "Both incoterms rule and location are required", variant: "destructive" });
      return;
    }

    saveIncotermsMutation.mutate({
      incotermsKey,
      incotermsLocation,
      isDefaulted: !!proposal && !isUserOverride,
      isUserOverride
    });
  };

  const handleAcceptProposal = () => {
    if (proposal) {
      setIncotermsKey(proposal.incotermsKey);
      setIncotermsLocation(proposal.incotermsLocation);
      setIsUserOverride(false);
      onIncotermsChange?.({
        incotermsKey: proposal.incotermsKey,
        incotermsLocation: proposal.incotermsLocation
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "All Modes":
        return <Truck className="h-4 w-4 text-blue-600" />;
      case "Sea/Inland Waterway":
        return <Ship className="h-4 w-4 text-green-600" />;
      default:
        return <Globe className="h-4 w-4 text-gray-600" />;
    }
  };

  const selectedIncoterm = incoterms.find(i => i.incotermsKey === incotermsKey);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Globe className="h-5 w-5" />
          <span>International Commercial Terms (Incoterms)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Proposal */}
        {proposal && !isUserOverride && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Customer Default Available</span>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              Customer {customerId} has default incoterms: <strong>{proposal.incotermsKey}</strong> at <strong>{proposal.incotermsLocation}</strong>
            </p>
            <Button size="sm" onClick={handleAcceptProposal}>
              Accept Customer Default
            </Button>
          </div>
        )}

        {/* Validation Warning */}
        {!incotermsKey || !incotermsLocation ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800">Required Fields Missing</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Both incoterms rule and location are mandatory before the order can be saved.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Incoterms Rule Selection */}
          <div className="space-y-2">
            <Label htmlFor="incoterms-key">Incoterms Rule (Part 1) *</Label>
            <Select value={incotermsKey} onValueChange={handleIncotermsKeyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select incoterms rule" />
              </SelectTrigger>
              <SelectContent>
                {incoterms.map((incoterm) => (
                  <SelectItem key={incoterm.id} value={incoterm.incotermsKey}>
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(incoterm.category)}
                      <span>{incoterm.incotermsKey} - {incoterm.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedIncoterm && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{selectedIncoterm.category}</Badge>
                  <Badge variant="outline">{selectedIncoterm.applicableVersion}</Badge>
                  {selectedIncoterm.applicableTransport && (
                    <Badge variant="secondary">{selectedIncoterm.applicableTransport}</Badge>
                  )}
                </div>
                {selectedIncoterm.riskTransferPoint && (
                  <div className="text-xs text-muted-foreground">
                    <strong>Risk Transfer:</strong> {selectedIncoterm.riskTransferPoint}
                  </div>
                )}
                {selectedIncoterm.costResponsibility && (
                  <div className="text-xs text-muted-foreground">
                    <strong>Cost Responsibility:</strong> {selectedIncoterm.costResponsibility}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Location Input */}
          <div className="space-y-2">
            <Label htmlFor="incoterms-location">Location (Part 2) *</Label>
            <Input
              id="incoterms-location"
              value={incotermsLocation}
              onChange={(e) => handleLocationChange(e.target.value)}
              placeholder="Enter port or location (e.g., New York Port)"
            />
            <p className="text-xs text-muted-foreground">
              Specify the port, place, or point where the goods are delivered
            </p>
          </div>
        </div>

        {/* Current Selection Display */}
        {incotermsKey && incotermsLocation && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">Selected Incoterms</span>
            </div>
            <p className="text-sm text-green-700">
              <strong>{incotermsKey}</strong> at <strong>{incotermsLocation}</strong>
              {isUserOverride && <span className="ml-2 text-xs">(User Override)</span>}
            </p>
          </div>
        )}

        {/* Save Button */}
        {salesOrderId && (
          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={!incotermsKey || !incotermsLocation || saveIncotermsMutation.isPending}
            >
              {saveIncotermsMutation.isPending ? "Saving..." : "Save Incoterms"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
