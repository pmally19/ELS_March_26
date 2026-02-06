import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Download, Plus, Eye, Upload, FileText, X, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/apiClient";
import CreateReceiptDialog from "./CreateReceiptDialog";

interface GoodsReceipt {
  id: number;
  receipt_number: string;
  po_number: string | null;
  vendor_name: string | null;
  receipt_date: string;
  status: string;
  delivery_note: string | null;
}

interface GoodsReceiptDocument {
  id: number;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  description?: string;
}

export default function ReceiptsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCreateReceiptDialogOpen, setIsCreateReceiptDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [documentDescription, setDocumentDescription] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch goods receipts from API
  const { data: receipts = [], isLoading, error, refetch: refetchReceipts } = useQuery<GoodsReceipt[]>({
    queryKey: ['/api/purchase/receipts'],
    queryFn: () => apiRequest<GoodsReceipt[]>('/api/purchase/receipts', 'GET'),
    refetchOnWindowFocus: false,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Fetch documents for selected receipt
  const { data: documents = [], refetch: refetchDocuments } = useQuery<GoodsReceiptDocument[]>({
    queryKey: ['/api/purchase/goods-receipts', selectedReceipt?.id, 'documents'],
    queryFn: async () => {
      if (!selectedReceipt?.id) return [];
      const response = await fetch(`/api/purchase/goods-receipts/${selectedReceipt.id}/documents`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.documents || [];
    },
    enabled: !!selectedReceipt?.id && isDetailDialogOpen,
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/purchase/goods-receipts/${selectedReceipt?.id}/documents`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document uploaded",
        description: "Document has been uploaded successfully.",
      });
      setUploadFile(null);
      setDocumentType("");
      setDocumentDescription("");
      setIsUploadDialogOpen(false);
      refetchDocuments();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/purchase/goods-receipts/documents/${documentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "Document has been deleted successfully.",
      });
      refetchDocuments();
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!uploadFile || !documentType || !selectedReceipt) {
      toast({
        title: "Missing information",
        description: "Please select a file and document type.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('document', uploadFile);
    formData.append('document_type', documentType);
    if (documentDescription) {
      formData.append('description', documentDescription);
    }

    uploadMutation.mutate(formData);
  };

  const handleDownload = (documentId: number, documentName: string) => {
    window.open(`/api/purchase/goods-receipts/documents/${documentId}/download`, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredReceipts = receipts.filter(receipt => 
    receipt.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    receipt.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    receipt.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    receipt.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500 text-white">Partial</Badge>;
      case 'pending inspection':
        return <Badge className="bg-blue-500 text-white">Pending Inspection</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search goods receipts..." 
            className="pl-8 rounded-md border border-input bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              console.log('Filter receipts clicked');
              // Add filter functionality
            }}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              console.log('Export receipts clicked');
              // Add export functionality
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            size="sm"
            onClick={() => setIsCreateReceiptDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Receipt
          </Button>
        </div>
      </div>
      
      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Goods Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading goods receipts...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Error loading goods receipts. Please try again.</p>
            </div>
          ) : filteredReceipts.length > 0 ? (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt Number</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Receipt Date</TableHead>
                    <TableHead>Delivery Note</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
                    <TableRow 
                      key={receipt.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedReceipt(receipt);
                        setIsDetailDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">{receipt.receipt_number || 'N/A'}</TableCell>
                      <TableCell>{receipt.po_number || 'N/A'}</TableCell>
                      <TableCell>{receipt.vendor_name || 'N/A'}</TableCell>
                      <TableCell>{formatDate(receipt.receipt_date)}</TableCell>
                      <TableCell>{receipt.delivery_note || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              {searchTerm ? 'No goods receipts match your search.' : 'No goods receipts found.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goods Receipt Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Goods Receipt Details</DialogTitle>
            <DialogDescription>
              View details and manage documents for {selectedReceipt?.receipt_number}
            </DialogDescription>
          </DialogHeader>

          {selectedReceipt && (
            <div className="space-y-6">
              {/* Receipt Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Receipt Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Receipt Number</Label>
                    <p className="font-medium">{selectedReceipt.receipt_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">PO Number</Label>
                    <p>{selectedReceipt.po_number || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Vendor</Label>
                    <p>{selectedReceipt.vendor_name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Receipt Date</Label>
                    <p>{formatDate(selectedReceipt.receipt_date)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div>{getStatusBadge(selectedReceipt.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Delivery Note</Label>
                    <p>{selectedReceipt.delivery_note || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Documents Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Documents</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setIsUploadDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.document_name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline">{doc.document_type}</Badge>
                                <span>{formatFileSize(doc.file_size)}</span>
                                <span>•</span>
                                <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(doc.id, doc.document_name);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this document?')) {
                                  deleteDocumentMutation.mutate(doc.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No documents uploaded yet</p>
                      <p className="text-sm">Click "Upload Document" to add documents</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document for {selectedReceipt?.receipt_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="document-type">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DELIVERY_NOTE">Delivery Note</SelectItem>
                  <SelectItem value="BILL_OF_LADING">Bill of Lading</SelectItem>
                  <SelectItem value="INSPECTION_REPORT">Inspection Report</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
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
                    setUploadFile(file);
                  }
                }}
              />
              {uploadFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter document description..."
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setUploadFile(null);
                  setDocumentType("");
                  setDocumentDescription("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || !documentType || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Goods Receipt Dialog */}
      <CreateReceiptDialog
        isOpen={isCreateReceiptDialogOpen}
        onClose={() => {
          setIsCreateReceiptDialogOpen(false);
          refetchReceipts();
        }}
      />
    </div>
  );
}