import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FileText, Mail, Download, Upload, Eye, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DocumentManagementTileProps {
  onBack: () => void;
}

export default function DocumentManagementTile({ onBack }: DocumentManagementTileProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AR documents
  const { data: arDocuments, isLoading, error: documentsError } = useQuery({
    queryKey: ['/api/ar/documents'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/ar/documents');
        if (!response.ok) {
          throw new Error(`Failed to fetch documents: ${response.statusText}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast({
          title: "Error Loading Documents",
          description: error instanceof Error ? error.message : "Failed to load documents",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  // Fetch document templates
  const { data: documentTemplates } = useQuery({
    queryKey: ['/api/ar/document-templates'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/ar/document-templates');
        if (!response.ok) {
          return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching templates:', error);
        return [];
      }
    },
  });

  // Fetch customers for document generation
  const { data: customers } = useQuery({
    queryKey: ['/api/master-data/customer'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/customer');
        if (!response.ok) {
          return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
      }
    },
  });

  // Generate document mutation
  const generateDocumentMutation = useMutation({
    mutationFn: async (documentData: any) => {
      const response = await apiRequest('/api/ar/generate-document', {
        method: 'POST',
        body: JSON.stringify(documentData),
      });
      return await response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Document Generated",
        description: "Document has been generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/documents'] });
      if (result?.download_url) {
        window.open(result.download_url, '_blank');
      }
      setShowDocumentForm(false);
    },
    onError: (error) => {
      toast({
        title: "Document Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send document via email mutation
  const sendDocumentMutation = useMutation({
    mutationFn: async (sendData: any) => {
      return await apiRequest('/api/ar/send-document', {
        method: 'POST',
        body: JSON.stringify(sendData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Document Sent",
        description: "Document has been sent via email successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/documents'] });
    },
    onError: (error) => {
      toast({
        title: "Send Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateDocument = () => {
    if (!documentType || !customerId) {
      toast({
        title: "Missing Information",
        description: "Please select document type and customer.",
        variant: "destructive",
      });
      return;
    }

    generateDocumentMutation.mutate({
      document_type: documentType,
      customer_id: customerId,
      generated_by: 'Current User',
      generated_date: new Date().toISOString(),
    });
  };

  const handleSendDocument = (documentId: string, customerEmail: string) => {
    sendDocumentMutation.mutate({
      document_id: documentId,
      recipient_email: customerEmail,
      sent_by: 'Current User',
      sent_date: new Date().toISOString(),
    });
  };

  const downloadDocument = (documentId: string) => {
    // Direct download using window.location.href (similar to order-to-cash route)
    window.location.href = `/api/ar/download-document/${documentId}`;
  };

  const filteredDocuments = Array.isArray(arDocuments) ? arDocuments.filter((doc) =>
    doc?.document_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc?.document_type?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  const getDocumentTypeBadge = (type: string) => {
    if (!type) return <Badge className="bg-gray-500 text-white">Unknown</Badge>;
    
    const normalizedType = type.toLowerCase().trim();
    const typeMap: { [key: string]: { color: string; label: string } } = {
      'invoice': { color: 'bg-blue-500', label: 'Invoice' },
      'statement': { color: 'bg-green-500', label: 'Statement' },
      'dunning_letter': { color: 'bg-red-500', label: 'Dunning Letter' },
      'payment_receipt': { color: 'bg-purple-500', label: 'Payment Receipt' },
      'credit_note': { color: 'bg-orange-500', label: 'Credit Note' },
      'credit memo': { color: 'bg-orange-500', label: 'Credit Note' },
      'f2': { color: 'bg-blue-500', label: 'Invoice' },
      'g2': { color: 'bg-orange-500', label: 'Credit Note' },
    };
    const config = typeMap[normalizedType] || { color: 'bg-gray-500', label: type };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'generated':
        return <Badge className="bg-blue-500 text-white">Generated</Badge>;
      case 'sent':
        return <Badge className="bg-green-500 text-white">Sent</Badge>;
      case 'viewed':
        return <Badge className="bg-purple-500 text-white">Viewed</Badge>;
      case 'failed':
        return <Badge className="bg-red-500 text-white">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Document Management Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(arDocuments?.length ?? 0)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sent Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {Array.isArray(arDocuments) ? arDocuments.filter((doc) => {
                    if (doc.status !== 'sent') return false;
                    if (!doc.sent_date && !doc.updated_at) return false;
                    const docDate = doc.sent_date || doc.updated_at;
                    try {
                      return new Date(docDate).toDateString() === new Date().toDateString();
                    } catch {
                      return false;
                    }
                  }).length : 0}
                </p>
              </div>
              <Mail className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {Array.isArray(arDocuments) ? arDocuments.filter((doc) => doc.status === 'generated').length : 0}
                </p>
              </div>
              <Upload className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Templates</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(documentTemplates?.length ?? 0)}
                </p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Generation Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Generate New Document</CardTitle>
            <Button
              onClick={() => setShowDocumentForm(!showDocumentForm)}
              variant={showDocumentForm ? "outline" : "default"}
            >
              {showDocumentForm ? 'Hide Form' : 'New Document'}
            </Button>
          </div>
        </CardHeader>
        {showDocumentForm && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="statement">Account Statement</SelectItem>
                    <SelectItem value="dunning_letter">Dunning Letter</SelectItem>
                    <SelectItem value="payment_receipt">Payment Receipt</SelectItem>
                    <SelectItem value="credit_note">Credit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(customers) ? customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    )) : null}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Template</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(documentTemplates) ? documentTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.template_name}
                      </SelectItem>
                    )) : null}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button 
                onClick={handleGenerateDocument}
                disabled={generateDocumentMutation.isPending}
              >
                {generateDocumentMutation.isPending ? 'Generating...' : 'Generate Document'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Document Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Document Templates</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {Array.isArray(documentTemplates) && documentTemplates.length > 0 ? (
    documentTemplates.map((template) => (
      <div key={template.id} className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">{template.template_name}</h4>
          {getDocumentTypeBadge(template.document_type)}
        </div>
        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
        <div className="flex space-x-2">
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button size="sm" variant="outline">
            Edit
          </Button>
        </div>
      </div>
    ))
  ) : (
    <div className="col-span-full text-center text-gray-500">
      No templates found
    </div>
  )}
</div>

        </CardContent>
      </Card>

      {/* Generated Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Generated Documents</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search documents..."
                className="w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Generated Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading documents...</TableCell>
                  </TableRow>
                ) : documentsError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-red-500">
                      Error loading documents. Please try again.
                    </TableCell>
                  </TableRow>
                ) : !Array.isArray(arDocuments) || filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      {searchTerm ? 'No documents match your search' : 'No documents found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => {
                    const docDate = doc.generated_date || doc.created_at || doc.invoice_date;
                    const formattedDate = docDate ? new Date(docDate).toLocaleDateString() : 'N/A';
                    
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          {doc.document_name || doc.invoice_number || doc.accounting_document_number || `DOC-${doc.id}`}
                        </TableCell>
                        <TableCell>{getDocumentTypeBadge((doc.document_type || doc.type || 'invoice').toLowerCase())}</TableCell>
                        <TableCell>{doc.customer_name || 'Unknown Customer'}</TableCell>
                        <TableCell>{formattedDate}</TableCell>
                        <TableCell>{getStatusBadge(doc.status || 'generated')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadDocument(doc.id)}
                              title="Download document"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {(doc.status === 'generated' || !doc.status || doc.posting_status !== 'POSTED') && (
                              <Button
                                size="sm"
                                onClick={() => handleSendDocument(doc.id, doc.customer_email || '')}
                                disabled={sendDocumentMutation.isPending}
                                title="Send document via email"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>

            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}