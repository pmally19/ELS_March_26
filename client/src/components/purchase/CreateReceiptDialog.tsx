import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/apiClient";
import { Upload, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PurchaseOrder {
  id: number;
  order_number: string;
  vendor_name: string;
  order_date: string;
  delivery_date: string;
  status: string;
  total_amount: number;
}

interface PurchaseOrderItem {
  id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  material_description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface CreateReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateReceiptDialog({ isOpen, onClose }: CreateReceiptDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPOId, setSelectedPOId] = useState<string>("");
  const [receivedBy, setReceivedBy] = useState<string>("");
  const [deliveryNote, setDeliveryNote] = useState<string>("");
  const [billOfLading, setBillOfLading] = useState<string>("");
  const [deliveryNoteFile, setDeliveryNoteFile] = useState<File | null>(null);
  const [billOfLadingFile, setBillOfLadingFile] = useState<File | null>(null);
  const [inspectionReportFile, setInspectionReportFile] = useState<File | null>(null);
  const [movementType, setMovementType] = useState<string>("101");
  const [documentTypeId, setDocumentTypeId] = useState<string>("");

  // Fetch document types
  const { data: documentTypes = [], isLoading: isLoadingDocTypes } = useQuery<any[]>({
    queryKey: ['/api/master-data/document-types'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/document-types');
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isOpen,
  });

  // Fetch movement types
  const { data: movementTypes = [], isLoading: isLoadingMovementTypes } = useQuery<any[]>({
    queryKey: ['/api/master-data/movement-types'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/movement-types');
      if (!response.ok) return [];
      const data = await response.json();
      // Return all active movement types, sorted by code
      return data
        .filter((mt: any) => (mt.code || mt.movement_type_code) && mt.is_active !== false)
        .sort((a: any, b: any) => String(a.code || a.movement_type_code).localeCompare(String(b.code || b.movement_type_code)));
    },
    enabled: isOpen,
  });

  // Fetch purchase orders that are not closed or cancelled
  const { data: purchaseOrders = [], isLoading: isLoadingPOs } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase/orders', { exclude: 'received,closed,cancelled' }],
    queryFn: async () => {
      const response = await fetch('/api/purchase/orders?exclude_status=RECEIVED,CLOSED,CANCELLED');
      if (!response.ok) return [];
      const data = await response.json();
      // Filter out closed, cancelled, and fully received orders
      return data.filter((po: PurchaseOrder) =>
        po.status &&
        !po.status.toUpperCase().includes('CLOSED') &&
        !po.status.toUpperCase().includes('CANCELLED') &&
        !po.status.toUpperCase().includes('RECEIVED')
      );
    },
    enabled: isOpen,
  });

  // Fetch PO items when a PO is selected
  const { data: poItems = [], isLoading: isLoadingItems } = useQuery<PurchaseOrderItem[]>({
    queryKey: ['/api/purchase/orders', selectedPOId, 'items'],
    queryFn: async () => {
      if (!selectedPOId) return [];
      const response = await fetch(`/api/purchase/orders/${selectedPOId}/items`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedPOId,
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ receiptId, file, documentType, description }: {
      receiptId: number;
      file: File;
      documentType: string;
      description?: string;
    }) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('document_type', documentType);
      if (description) {
        formData.append('description', description);
      }

      const response = await fetch(`/api/purchase/goods-receipts/${receiptId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      return response.json();
    },
  });

  // Create goods receipt mutation
  const createReceiptMutation = useMutation({
    mutationFn: async (data: {
      purchase_order_id: number;
      received_by?: string;
      delivery_note?: string;
      bill_of_lading?: string;
      movement_type?: string;
      document_type_id?: number;
    }) => {
      const response = await fetch('/api/purchase/copy-po-to-goods-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to create goods receipt');
      }

      return response.json();
    },
    onSuccess: async (data) => {
      // Get the first goods receipt ID from the response
      // Response structure: { goods_receipts: [{ grn_id: ..., ... }], ... }
      const receiptId = data.goods_receipts?.[0]?.grn_id || data.grn_id;

      console.log('Goods receipt created, receipt ID:', receiptId);
      console.log('Response data:', data);

      // Upload documents if files are provided
      if (receiptId) {
        const uploadPromises = [];

        if (deliveryNoteFile) {
          console.log('Uploading delivery note file:', deliveryNoteFile.name);
          uploadPromises.push(
            uploadDocumentMutation.mutateAsync({
              receiptId,
              file: deliveryNoteFile,
              documentType: 'DELIVERY_NOTE',
              description: deliveryNote || 'Delivery note uploaded during receipt creation',
            }).catch(err => {
              console.error('Error uploading delivery note:', err);
              throw err;
            })
          );
        }

        if (billOfLadingFile) {
          console.log('Uploading bill of lading file:', billOfLadingFile.name);
          uploadPromises.push(
            uploadDocumentMutation.mutateAsync({
              receiptId,
              file: billOfLadingFile,
              documentType: 'BILL_OF_LADING',
              description: billOfLading || 'Bill of lading uploaded during receipt creation',
            }).catch(err => {
              console.error('Error uploading bill of lading:', err);
              throw err;
            })
          );
        }

        if (inspectionReportFile) {
          console.log('Uploading inspection report file:', inspectionReportFile.name);
          uploadPromises.push(
            uploadDocumentMutation.mutateAsync({
              receiptId,
              file: inspectionReportFile,
              documentType: 'INSPECTION_REPORT',
              description: 'Inspection report uploaded during receipt creation',
            }).catch(err => {
              console.error('Error uploading inspection report:', err);
              throw err;
            })
          );
        }

        if (uploadPromises.length > 0) {
          try {
            await Promise.all(uploadPromises);
            toast({
              title: "Documents Uploaded",
              description: `Successfully uploaded ${uploadPromises.length} document(s).`,
            });
          } catch (uploadError: any) {
            console.error('Error uploading documents:', uploadError);
            // Don't fail the whole operation if document upload fails
            toast({
              title: "Receipt Created, Document Upload Warning",
              description: uploadError.message || "Goods receipt created but some documents may not have uploaded. You can upload them later.",
              variant: "default",
            });
          }
        }
      } else {
        console.warn('No receipt ID found in response, cannot upload documents');
      }

      toast({
        title: "Goods Receipt Created",
        description: `Goods receipt created successfully from purchase order.`,
      });
      // Invalidate all related queries to ensure payment tab updates
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/vendor-payments'] });
      // Invalidate any validation queries that check for goods receipts
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/vendor-payments/validate'] });
      // Refetch purchase orders immediately to update the payment tab
      queryClient.refetchQueries({ queryKey: ['/api/purchase/orders'] });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Goods Receipt",
        description: error.message || "Failed to create goods receipt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedPOId("");
    setReceivedBy("");
    setDeliveryNote("");
    setBillOfLading("");
    setDeliveryNoteFile(null);
    setBillOfLadingFile(null);
    setInspectionReportFile(null);
    setMovementType("101");
    setDocumentTypeId("");
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = () => {
    if (!selectedPOId) {
      toast({
        title: "Purchase Order Required",
        description: "Please select a purchase order.",
        variant: "destructive",
      });
      return;
    }

    createReceiptMutation.mutate({
      purchase_order_id: parseInt(selectedPOId),
      received_by: receivedBy || undefined,
      delivery_note: deliveryNote || undefined,
      bill_of_lading: billOfLading || undefined,
      movement_type: movementType || undefined,
      document_type_id: documentTypeId ? parseInt(documentTypeId) : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Goods Receipt from Purchase Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="purchase-order">Purchase Order *</Label>
            <Select value={selectedPOId} onValueChange={setSelectedPOId}>
              <SelectTrigger>
                <SelectValue placeholder="Select purchase order" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingPOs ? (
                  <SelectItem value="loading" disabled>Loading purchase orders...</SelectItem>
                ) : purchaseOrders.length > 0 ? (
                  purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id.toString()}>
                      {po.order_number} - {po.vendor_name} ({po.status})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No available purchase orders</SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedPOId && (
              <p className="text-sm text-muted-foreground">
                Selected: {purchaseOrders.find(po => po.id.toString() === selectedPOId)?.order_number}
              </p>
            )}
          </div>

          {/* Material Details Table */}
          {selectedPOId && (
            <div className="space-y-2">
              <Label>Materials in Purchase Order</Label>
              <div className="border rounded-md">
                {isLoadingItems ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Loading materials...
                  </div>
                ) : poItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 text-left font-medium">Material Code</th>
                          <th className="p-2 text-left font-medium">Description</th>
                          <th className="p-2 text-right font-medium">Ordered Qty</th>
                          <th className="p-2 text-left font-medium">Unit</th>
                          <th className="p-2 text-right font-medium">Unit Price</th>
                          <th className="p-2 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poItems.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-2 font-mono">{item.material_code}</td>
                            <td className="p-2">
                              <div className="font-medium">{item.material_name}</div>
                              {item.material_description && (
                                <div className="text-xs text-muted-foreground">
                                  {item.material_description}
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2">{item.unit}</td>
                            <td className="p-2 text-right">
                              {item.unit_price.toFixed(2)}
                            </td>
                            <td className="p-2 text-right font-medium">
                              {item.total_price.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No materials found for this purchase order
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Select value={documentTypeId} onValueChange={setDocumentTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-determined from Movement Type if empty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled className="hidden">Select Document Type...</SelectItem>
                {isLoadingDocTypes ? (
                  <SelectItem value="loading" disabled>Loading document types...</SelectItem>
                ) : documentTypes.length > 0 ? (
                  documentTypes.map((dt: any) => (
                    <SelectItem key={dt.id} value={dt.id.toString()}>
                      {dt.document_type_code} - {dt.description}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="empty" disabled>No document types found</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement-type">Movement Type *</Label>
            <Select value={movementType} onValueChange={setMovementType}>
              <SelectTrigger>
                <SelectValue placeholder="Select movement type" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingMovementTypes ? (
                  <SelectItem value="loading" disabled>Loading movement types...</SelectItem>
                ) : movementTypes.length > 0 ? (
                  movementTypes.map((mt: any) => (
                    <SelectItem key={mt.id} value={mt.code || mt.movement_type_code}>
                      {mt.code || mt.movement_type_code} - {mt.description || mt.name}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="101">101 - Goods Receipt for Purchase Order</SelectItem>
                    <SelectItem value="103">103 - GR into GR Blocked Stock</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Default: 101 - Goods Receipt for Purchase Order
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="received-by">Received By</Label>
            <Input
              id="received-by"
              placeholder="Enter name of person who received the goods"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-note">Delivery Note</Label>
            <Input
              id="delivery-note"
              placeholder="Enter delivery note number"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
            />
            <div className="mt-2">
              <Label htmlFor="delivery-note-file" className="text-sm text-muted-foreground">
                Upload Delivery Note Document
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="delivery-note-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        toast({
                          title: "File too large",
                          description: "File size must be less than 10MB",
                          variant: "destructive",
                        });
                        return;
                      }
                      setDeliveryNoteFile(file);
                    }
                  }}
                  className="cursor-pointer"
                />
                {deliveryNoteFile && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {deliveryNoteFile.name} ({formatFileSize(deliveryNoteFile.size)})
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeliveryNoteFile(null)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bill-of-lading">Bill of Lading</Label>
            <Input
              id="bill-of-lading"
              placeholder="Enter bill of lading number"
              value={billOfLading}
              onChange={(e) => setBillOfLading(e.target.value)}
            />
            <div className="mt-2">
              <Label htmlFor="bill-of-lading-file" className="text-sm text-muted-foreground">
                Upload Bill of Lading Document
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="bill-of-lading-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        toast({
                          title: "File too large",
                          description: "File size must be less than 10MB",
                          variant: "destructive",
                        });
                        return;
                      }
                      setBillOfLadingFile(file);
                    }
                  }}
                  className="cursor-pointer"
                />
                {billOfLadingFile && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {billOfLadingFile.name} ({formatFileSize(billOfLadingFile.size)})
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setBillOfLadingFile(null)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspection-report-file">Inspection Report Document (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="inspection-report-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      toast({
                        title: "File too large",
                        description: "File size must be less than 10MB",
                        variant: "destructive",
                      });
                      return;
                    }
                    setInspectionReportFile(file);
                  }
                }}
                className="cursor-pointer"
              />
              {inspectionReportFile && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {inspectionReportFile.name} ({formatFileSize(inspectionReportFile.size)})
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setInspectionReportFile(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPOId || createReceiptMutation.isPending || uploadDocumentMutation.isPending}
          >
            {createReceiptMutation.isPending || uploadDocumentMutation.isPending
              ? "Creating..."
              : "Create Goods Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
