import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, Database, CheckCircle, XCircle, Clock, AlertTriangle, MessageCircle, User, Bot, Send, Brain, MessageSquare, Rocket, ExternalLink, Eye, Image, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReviewAndApproveSection from '@/components/ReviewAndApproveSection';
import ImplementationContent from '@/components/ImplementationContent';
import StructuredWorkflow from '@/components/StructuredWorkflowFixed';

interface DesignerDocument {
  id: number;
  file_name: string;
  file_type: string;
  document_type: string;
  status: string;
  uploaded_by: string;
  uploaded_at: string;
  upload_path?: string;
  file_size?: number;
}

export default function DesignerAgent() {
  const [activeTab, setActiveTab] = useState('structured-workflow');
  const [documents, setDocuments] = useState<DesignerDocument[]>([]);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [selectedDocumentName, setSelectedDocumentName] = useState<string>('General Ledger document');
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [analysisTimeRemaining, setAnalysisTimeRemaining] = useState<number>(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [analysisScope, setAnalysisScope] = useState<string[]>(['database_tables', 'ui_pages', 'api_endpoints']);
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      id: 1,
      type: 'bot',
      content: '🚀 Enhanced Designer Agent Ready! I now have live implementation capabilities:\n\n• **Live Code Generation** - Create actual working code\n• **Real-time Database Operations** - Execute SQL and create tables\n• **File Creation** - Generate components and pages\n• **Integration Testing** - Test implementations live\n• **Advanced Analysis** - Deep ERP system understanding\n\nTry: "Create a customer loyalty program" or "Build a new inventory tracking system"',
      timestamp: new Date()
    }
  ]);
  
  const [liveImplementationMode, setLiveImplementationMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<'preview' | 'design-guide' | 'list' | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DesignerDocument | null>(null);
  const [screenshotAnalysis, setScreenshotAnalysis] = useState<any>(null);
  const [implementationResults, setImplementationResults] = useState<any>(null);
  const [implementationPreview, setImplementationPreview] = useState<any>(null);
  const [applyInProgress, setApplyInProgress] = useState(false);
  
  // Workflow state management - your requested sequence
  const [workflowStep, setWorkflowStep] = useState<'upload' | 'analysis' | 'chat-determination' | 'preview' | 'changes' | 'final-draft' | 'review-approve' | 'build'>('upload');
  const [developmentPlan, setDevelopmentPlan] = useState<any>(null);
  const [chatDetermination, setChatDetermination] = useState<any>(null);
  const [pagePreview, setPagePreview] = useState<any>(null);
  const [finalDraft, setFinalDraft] = useState<any>(null);
  const [chatAnswers, setChatAnswers] = useState<Record<number, string>>({});
  const [previewChanges, setPreviewChanges] = useState<string>('');

  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/designer-agent/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleGenerateImplementationPreview = async () => {
    if (!selectedDocumentId) {
      toast({
        title: 'No Document Selected',
        description: 'Select a document first in Analyze tab.',
        variant: 'destructive'
      });
      return;
    }
    try {
      const response = await fetch('/api/designer-agent/implementation/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocumentId,
          analysisScope
        })
      });
      if (!response.ok) throw new Error('Failed to generate preview');
      const data = await response.json();
      setImplementationPreview(data);
      toast({ title: 'Preview Ready', description: 'Review the changes and choose Apply or Don\'t Apply.' });
    } catch (e: any) {
      toast({ title: 'Preview Failed', description: e?.message || 'Could not generate preview', variant: 'destructive' });
    }
  };

  const handleApplyImplementation = async () => {
    if (!implementationPreview) return;
    setApplyInProgress(true);
    try {
      const response = await fetch('/api/designer-agent/implementation/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sqlMigrations: implementationPreview.sqlMigrations || [],
          fileCreations: implementationPreview.fileCreations || []
        })
      });
      if (!response.ok) throw new Error('Apply failed');
      const data = await response.json();
      setImplementationResults(data);
      setImplementationPreview(null);
      toast({ title: 'Applied', description: 'Implementation applied successfully.' });
    } catch (e: any) {
      toast({ title: 'Apply Failed', description: e?.message || 'Could not apply changes', variant: 'destructive' });
    } finally {
      setApplyInProgress(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedDocumentId) {
      toast({
        title: "No Document Selected",
        description: "Please select a document first.",
        variant: "destructive"
      });
      return;
    }

    setAnalysisLoading(true);
    setAnalysisTimeRemaining(45);
    setAnalysisProgress('Initializing analysis...');

    // Progress simulation
    const progressSteps = [
      { time: 5, message: 'Reading document content...' },
      { time: 15, message: 'Analyzing business requirements...' },
      { time: 25, message: 'Identifying database schema changes...' },
      { time: 35, message: 'Generating UI component recommendations...' },
      { time: 40, message: 'Creating implementation plan...' },
      { time: 45, message: 'Finalizing analysis results...' }
    ];

    const progressInterval = setInterval(() => {
      setAnalysisTimeRemaining(prev => {
        const newTime = prev - 1;
        const currentStep = progressSteps.find(step => step.time >= (45 - newTime));
        if (currentStep) {
          setAnalysisProgress(currentStep.message);
        }
        return newTime;
      });
    }, 1000);

    try {
      const response = await fetch('/api/designer-agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocumentId,
          analysisType: 'selective_analysis',
          analysisScope: analysisScope
        })
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setAnalysisResults(data);
        setAnalysisLoading(false);
        setAnalysisTimeRemaining(0);
        
        toast({
          title: "Selective Analysis Complete",
          description: `Analysis completed for ${analysisScope.length} selected components. Results are ready for review.`,
        });

        // Auto-switch to review tab after successful analysis
        setTimeout(() => {
          setActiveTab('review');
        }, 2000);
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      setAnalysisLoading(false);
      setAnalysisTimeRemaining(0);
      
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze the document. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png', 'image/jpeg', 'image/jpg',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.drawio')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload PDF, Word, PowerPoint, PNG, JPEG, TXT, or Draw.io files only.",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    // Use a consistent field name that the backend accepts regardless of key
    formData.append('file', file);
    formData.append('documentType', 'business_requirement');

    try {
      setUploadProgress(0);
      const response = await fetch('/api/designer-agent/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Upload Successful",
          description: `Document "${file.name}" uploaded successfully.`,
        });
        fetchDocuments();
        setUploadProgress(100);
      } else {
        let errorMessage = 'Upload failed';
        try {
          const errText = await response.text();
          errorMessage = errText || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error?.message || "Failed to upload document. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePreviewDocument = (doc: DesignerDocument) => {
    setSelectedDocument(doc);
    setPreviewMode('preview');
    setActiveTab('preview');
  };

  const handleScreenshotAnalysis = async (doc: DesignerDocument) => {
    if (!doc.file_type?.includes('png') && !doc.file_type?.includes('jpg') && !doc.file_type?.includes('jpeg')) {
      toast({
        title: "Invalid File Type",
        description: "Screenshot analysis only works with image files (PNG, JPG, JPEG)",
        variant: "destructive"
      });
      return;
    }

    setSelectedDocument(doc);
    setPreviewMode('design-guide');
    setAnalysisLoading(true);

    try {
      const response = await fetch('/api/designer-agent/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentId: doc.id,
          analysisType: 'design-guidance'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setScreenshotAnalysis(result);
        toast({
          title: "Screenshot Analysis Complete",
          description: "Design guidance and page recommendations generated"
        });
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze screenshot. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const question = chatInput;
    setChatInput('');

    // Detect if this is a live implementation request
    const isImplementationRequest = question.toLowerCase().includes('create') || 
                                  question.toLowerCase().includes('build') || 
                                  question.toLowerCase().includes('implement') || 
                                  question.toLowerCase().includes('generate');

    // Add appropriate typing indicator
    const typingMessage = {
      id: Date.now() + 1,
      type: 'bot',
      content: isImplementationRequest && liveImplementationMode ? 
        '🚀 Live implementation mode activated... Generating and implementing code...' : 
        'Analyzing your question...',
      timestamp: new Date(),
      isTyping: true
    };
    setChatMessages(prev => [...prev, typingMessage]);

    try {
      let endpoint = '/api/designer-agent/chat';
      let requestBody: any = {
        message: question,
        documentId: selectedDocumentId || (documents.length > 0 ? documents[0].id : null)
      };

      // Use enhanced chat endpoint for live implementation
      if (isImplementationRequest && liveImplementationMode) {
        endpoint = '/api/designer-agent/enhanced-chat';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Remove typing indicator and add actual response
        setChatMessages(prev => {
          const withoutTyping = prev.filter(msg => !msg.isTyping);
          return [...withoutTyping, {
            id: Date.now() + 2,
            type: 'bot',
            content: data.response,
            timestamp: new Date(),
            suggestedActions: data.suggestedActions || [],
            implementationType: data.implementationType
          }];
        });

        if (data.analysisCreated) {
          toast({
            title: "Analysis Created",
            description: "Your instruction has been converted to a formal analysis for review.",
          });
        }

        // If live implementation suggestions are provided, show them
        if (data.suggestedActions && data.suggestedActions.length > 0) {
          setChatMessages(prev => [...prev, {
            id: Date.now() + 3,
            type: 'bot',
            content: '💡 **Available Actions:**\n' + data.suggestedActions.map(action => `• ${action}`).join('\n'),
            timestamp: new Date(),
            isActionMenu: true
          }]);
        }
      } else {
        throw new Error('Chat request failed');
      }
    } catch (error) {
      setChatMessages(prev => {
        const withoutTyping = prev.filter(msg => !msg.isTyping);
        return [...withoutTyping, {
          id: Date.now() + 2,
          type: 'bot',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
          timestamp: new Date()
        }];
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Designer Agent</h1>
        <p className="text-gray-600">Intelligent document analysis and system architecture design</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="structured-workflow">Structured Workflow</TabsTrigger>
          <TabsTrigger value="upload">Upload Document</TabsTrigger>
          <TabsTrigger value="preview">Preview & Guide</TabsTrigger>
          <TabsTrigger value="analyze">Analyze & Design</TabsTrigger>
          <TabsTrigger value="review">Review & Approve</TabsTrigger>
          <TabsTrigger value="implementation">Implementation</TabsTrigger>
        </TabsList>

        <TabsContent value="structured-workflow">
          <StructuredWorkflow 
            documents={documents} 
            onDocumentSelect={setSelectedDocumentId}
          />
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Business Requirement Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Upload your business requirement documents</p>
                <p className="text-sm text-gray-500">Supports PDF, Word, PowerPoint, PNG, JPEG, Draw.io files</p>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.drawio"
                  onChange={handleFileUpload}
                  className="mt-4"
                />
              </div>
              
              {documents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Uploaded Documents</h3>
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {doc.file_type?.includes('png') || doc.file_type?.includes('jpg') || doc.file_type?.includes('jpeg') ? (
                          <Image className="h-5 w-5 text-blue-600" />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-600" />
                        )}
                        <div>
                          <p className="font-medium">{doc.file_name}</p>
                          <p className="text-sm text-gray-500">{doc.document_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreviewDocument(doc)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </Button>
                        {(doc.file_type?.includes('png') || doc.file_type?.includes('jpg') || doc.file_type?.includes('jpeg')) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleScreenshotAnalysis(doc)}
                            className="flex items-center gap-1"
                          >
                            <Brain className="h-4 w-4" />
                            Design Guide
                          </Button>
                        )}
                        <Badge variant="outline">{doc.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Document Preview & Design Guidance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewMode === 'list' && (
                <div className="space-y-4">
                  <p className="text-gray-600">Select a document to preview or get design guidance for screenshots</p>
                  {documents.length > 0 ? (
                    <div className="grid gap-4">
                      {documents.map((doc) => (
                        <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {doc.file_type?.includes('png') || doc.file_type?.includes('jpg') || doc.file_type?.includes('jpeg') ? (
                                <Image className="h-6 w-6 text-blue-600" />
                              ) : (
                                <File className="h-6 w-6 text-blue-600" />
                              )}
                              <div>
                                <h4 className="font-medium">{doc.file_name}</h4>
                                <p className="text-sm text-gray-500">{doc.document_type} • {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : 'Unknown size'}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePreviewDocument(doc)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              {(doc.file_type?.includes('png') || doc.file_type?.includes('jpg') || doc.file_type?.includes('jpeg')) && (
                                <Button
                                  size="sm"
                                  onClick={() => handleScreenshotAnalysis(doc)}
                                >
                                  <Brain className="h-4 w-4 mr-1" />
                                  Design Guide
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No documents uploaded yet</p>
                      <p className="text-sm text-gray-500">Go to the Upload tab to add documents</p>
                    </div>
                  )}
                </div>
              )}

              {previewMode === 'preview' && selectedDocument && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setPreviewMode('list')}
                      >
                        ← Back to List
                      </Button>
                      <h3 className="font-semibold">{selectedDocument.file_name}</h3>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6 bg-gray-50">
                    {selectedDocument.file_type?.includes('png') || selectedDocument.file_type?.includes('jpg') || selectedDocument.file_type?.includes('jpeg') ? (
                      <div className="text-center">
                        <Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h4 className="font-medium mb-2">Screenshot Preview</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          This is a screenshot file. Use the "Design Guide" feature to get AI-powered 
                          design recommendations for building similar pages in MallyERP.
                        </p>
                        <Button 
                          onClick={() => handleScreenshotAnalysis(selectedDocument)}
                          disabled={analysisLoading}
                        >
                          {analysisLoading ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Brain className="h-4 w-4 mr-2" />
                              Get Design Guidance
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h4 className="font-medium mb-2">Document Preview</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Document content preview will be available here. 
                          Use the "Analyze & Design" tab for AI-powered business requirement analysis.
                        </p>
                        <Button onClick={() => setActiveTab('analyze')}>
                          <Brain className="h-4 w-4 mr-2" />
                          Analyze Document
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {previewMode === 'design-guide' && selectedDocument && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setPreviewMode('list')}
                      >
                        ← Back to List
                      </Button>
                      <h3 className="font-semibold">Design Guidance: {selectedDocument.file_name}</h3>
                    </div>
                  </div>

                  {analysisLoading ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                      <h4 className="font-medium mb-2">Analyzing Screenshot...</h4>
                      <p className="text-sm text-gray-600">AI is examining your screenshot to provide design guidance</p>
                    </div>
                  ) : screenshotAnalysis ? (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Brain className="h-5 w-5" />
                            AI Design Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: screenshotAnalysis.designGuidance || 'Design analysis will appear here' }} />
                          </div>
                        </CardContent>
                      </Card>

                      {screenshotAnalysis.pageRecommendations && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Rocket className="h-5 w-5" />
                              Implementation Recommendations
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {screenshotAnalysis.pageRecommendations.map((rec: any, index: number) => (
                                <div key={index} className="border rounded-lg p-4">
                                  <h4 className="font-medium mb-2">{rec.title}</h4>
                                  <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline">
                                      <ExternalLink className="h-4 w-4 mr-1" />
                                      View Implementation
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="font-medium mb-2">Ready for Analysis</h4>
                      <p className="text-sm text-gray-600 mb-4">Click the button to start AI-powered design analysis</p>
                      <Button onClick={() => handleScreenshotAnalysis(selectedDocument)}>
                        <Brain className="h-4 w-4 mr-2" />
                        Analyze Screenshot
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyze">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Powered Document Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Selection */}
              {documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Select Document for Analysis</CardTitle>
                    <p className="text-sm text-gray-600">Choose which uploaded document to analyze</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                          <input
                            type="radio"
                            id={`doc-${doc.id}`}
                            name="selectedDocument"
                            value={doc.id}
                            checked={selectedDocumentId === doc.id}
                            onChange={() => {
                              setSelectedDocumentId(doc.id);
                              setSelectedDocumentName(doc.file_name);
                            }}
                            className="h-4 w-4 text-blue-600"
                          />
                          <label htmlFor={`doc-${doc.id}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="font-medium">{doc.file_name}</p>
                                <p className="text-sm text-gray-500">{doc.document_type} • {doc.status}</p>
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedDocumentId && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>Selected:</strong> {selectedDocumentName}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Analysis Trigger */}
              {selectedDocumentId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Start Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Ready to analyze "{selectedDocumentName}" and generate implementation recommendations.
                      </p>
                      
                      {/* Selective Analysis Options */}
                      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold text-sm">Select Implementation Scope:</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={analysisScope.includes('database_tables')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAnalysisScope([...analysisScope, 'database_tables']);
                                } else {
                                  setAnalysisScope(analysisScope.filter(s => s !== 'database_tables'));
                                }
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm">Database Tables</span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={analysisScope.includes('ui_pages')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAnalysisScope([...analysisScope, 'ui_pages']);
                                } else {
                                  setAnalysisScope(analysisScope.filter(s => s !== 'ui_pages'));
                                }
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm">UI Pages</span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={analysisScope.includes('api_endpoints')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAnalysisScope([...analysisScope, 'api_endpoints']);
                                } else {
                                  setAnalysisScope(analysisScope.filter(s => s !== 'api_endpoints'));
                                }
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm">API Endpoints</span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={analysisScope.includes('business_logic')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAnalysisScope([...analysisScope, 'business_logic']);
                                } else {
                                  setAnalysisScope(analysisScope.filter(s => s !== 'business_logic'));
                                }
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm">Business Logic</span>
                          </label>
                        </div>
                        <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                          💡 Select only the components you want to implement from the document
                        </div>
                      </div>

                      <Button 
                        onClick={handleStartAnalysis}
                        disabled={analysisLoading || analysisScope.length === 0}
                        className="w-full"
                      >
                        {analysisLoading ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing Selected Components...
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4 mr-2" />
                            Start Selective Analysis ({analysisScope.length} components)
                          </>
                        )}
                      </Button>
                      
                      {analysisLoading && (
                        <div className="space-y-3">
                          <Progress value={(45 - analysisTimeRemaining) / 45 * 100} className="w-full" />
                          <div className="text-center space-y-1">
                            <p className="text-sm font-medium">{analysisProgress}</p>
                            <p className="text-xs text-gray-500">
                              Estimated time remaining: {analysisTimeRemaining} seconds
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Live Implementation Mode Toggle */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Rocket className="h-5 w-5" />
                      Enhanced Designer Agent
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Live Implementation</label>
                      <button
                        onClick={() => setLiveImplementationMode(!liveImplementationMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          liveImplementationMode ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            liveImplementationMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={liveImplementationMode ? "default" : "secondary"}>
                      {liveImplementationMode ? "Live Mode ON" : "Analysis Mode"}
                    </Badge>
                    <p className="text-sm text-gray-600">
                      {liveImplementationMode 
                        ? "AI will generate and implement code in real-time" 
                        : "AI will analyze and provide recommendations only"
                      }
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  {liveImplementationMode && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-800 flex items-center gap-2">
                        <Rocket className="h-4 w-4" />
                        Live Implementation Features Active
                      </h4>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-green-700">
                        <div>• Real-time code generation</div>
                        <div>• Database table creation</div>
                        <div>• Component development</div>
                        <div>• API endpoint implementation</div>
                      </div>
                      <div className="mt-2 text-xs text-green-600">
                        Try: "Create a customer loyalty program" or "Build an inventory tracking system"
                      </div>
                    </div>
                  )}
                  
                {liveImplementationMode && (
                  <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <h4 className="font-semibold">Implementation Preview</h4>
                        <p className="text-sm text-gray-600">Generate a preview of SQL and files. You must approve before applying.</p>
                      </div>
                      <Button size="sm" onClick={handleGenerateImplementationPreview} disabled={!selectedDocumentId}>
                        Generate Preview
                      </Button>
                    </div>

                    {implementationPreview && (
                      <div className="mt-4 space-y-3">
                        <div className="text-sm">
                          <strong>SQL Migrations:</strong> {implementationPreview.sqlMigrations?.length || 0}
                        </div>
                        {implementationPreview.sqlMigrations?.length > 0 && (
                          <ul className="list-disc pl-6 text-sm text-gray-700">
                            {implementationPreview.sqlMigrations.map((m: any, idx: number) => (
                              <li key={idx}>{m.name}</li>
                            ))}
                          </ul>
                        )}
                        <div className="text-sm">
                          <strong>Files Created:</strong> {implementationPreview.fileCreations?.length || 0}
                        </div>
                        {implementationPreview.fileCreations?.length > 0 && (
                          <ul className="list-disc pl-6 text-sm text-gray-700">
                            {implementationPreview.fileCreations.map((f: any, idx: number) => (
                              <li key={idx}>{f.path}</li>
                            ))}
                          </ul>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" onClick={handleApplyImplementation} disabled={applyInProgress}>
                            {applyInProgress ? 'Applying...' : 'Apply'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setImplementationPreview(null)}>
                            Don\'t Apply
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                  {implementationResults && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-800">Implementation Results</h4>
                      <div className="mt-2 space-y-2 text-sm">
                        {implementationResults.filesCreated.length > 0 && (
                          <div>
                            <strong>Files Created:</strong> {implementationResults.filesCreated.join(', ')}
                          </div>
                        )}
                        {implementationResults.databaseChanges.length > 0 && (
                          <div>
                            <strong>Database Changes:</strong> {implementationResults.databaseChanges.length} operations
                          </div>
                        )}
                        {implementationResults.apiEndpoints.length > 0 && (
                          <div>
                            <strong>API Endpoints:</strong> {implementationResults.apiEndpoints.length} created
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chat Interface */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    {liveImplementationMode ? "Live Implementation Chat" : "Analysis Chat"}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    {liveImplementationMode 
                      ? "Ask for live code generation and real-time implementation" 
                      : "Ask questions about your ERP system, uploaded document, or analysis results"
                    }
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <ScrollArea className="h-60 border rounded p-3 bg-gray-50">
                      <div className="space-y-3">
                        {chatMessages.map((message) => (
                          <div key={message.id} className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white border">
                                {message.type === 'user' ? <User className="w-3 h-3 text-blue-600" /> : <Bot className="w-3 h-3 text-green-600" />}
                              </div>
                              <div className={`p-3 rounded-lg text-sm whitespace-pre-line ${
                                message.type === 'user' 
                                  ? 'bg-blue-500 text-white rounded-br-none' 
                                  : 'bg-white text-gray-800 border rounded-bl-none'
                              }`}>
                                {message.isTyping ? (
                                  <div className="flex items-center gap-1">
                                    <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full"></div>
                                    <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full" style={{animationDelay: '0.1s'}}></div>
                                    <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full" style={{animationDelay: '0.2s'}}></div>
                                    <span className="ml-2 text-gray-500">Analyzing...</span>
                                  </div>
                                ) : (
                                  message.content
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask about ERP tables, document requirements, or integration points..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} size="sm" className="px-4">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <ReviewAndApproveSection />
        </TabsContent>

        <TabsContent value="implementation">
          <ImplementationContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}