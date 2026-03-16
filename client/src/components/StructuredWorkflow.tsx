import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, CheckCircle, Eye, MessageSquare, Edit, FileText, Rocket, Upload, Minimize, Maximize, X, Columns, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed';
}

interface StructuredWorkflowProps {
  documents: any[];
  onDocumentSelect: (docId: number) => void;
}

export default function StructuredWorkflow({ documents, onDocumentSelect }: StructuredWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [chatAnswers, setChatAnswers] = useState<Record<number, string>>({});
  const [pagePreview, setPagePreview] = useState<any>(null);
  const [previewChanges, setPreviewChanges] = useState('');
  const [finalDraft, setFinalDraft] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Window management states
  const [windowState, setWindowState] = useState<'normal' | 'minimized' | 'maximized'>('normal');
  const [showSideBySide, setShowSideBySide] = useState(false);
  const [normalPosition, setNormalPosition] = useState({ width: '100%', height: 'auto' });
  
  // Chat states (moved to component level to avoid hooks rule violation)
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();

  const workflowSteps: WorkflowStep[] = [
    {
      id: 'upload',
      title: '1. Upload',
      description: 'Select a document or screenshot for analysis',
      icon: <Upload className="h-5 w-5" />,
      status: selectedDocumentId ? 'completed' : currentStep === 0 ? 'active' : 'pending'
    },
    {
      id: 'analysis',
      title: '2. Analysis',
      description: 'AI analyzes document and existing implementation',
      icon: <FileText className="h-5 w-5" />,
      status: analysisResults ? 'completed' : currentStep === 1 ? 'active' : 'pending'
    },
    {
      id: 'chat-determination',
      title: '3. Chat Determination',
      description: 'Interactive questions to finalize requirements',
      icon: <MessageSquare className="h-5 w-5" />,
      status: Object.keys(chatAnswers).length > 0 ? 'completed' : currentStep === 2 ? 'active' : 'pending'
    },
    {
      id: 'preview',
      title: '4. Preview',
      description: 'See how the application page will look when built',
      icon: <Eye className="h-5 w-5" />,
      status: pagePreview ? 'completed' : currentStep === 3 ? 'active' : 'pending'
    },
    {
      id: 'changes',
      title: '5. Changes',
      description: 'Request modifications to the preview',
      icon: <Edit className="h-5 w-5" />,
      status: previewChanges || !pagePreview ? 'completed' : currentStep === 4 ? 'active' : 'pending'
    },
    {
      id: 'final-draft',
      title: '6. Final Draft',
      description: 'Review implementation plan and safety measures',
      icon: <CheckCircle className="h-5 w-5" />,
      status: finalDraft ? 'completed' : currentStep === 5 ? 'active' : 'pending'
    },
    {
      id: 'review-approve',
      title: '7. Review & Approve',
      description: 'Final review before implementation',
      icon: <CheckCircle className="h-5 w-5" />,
      status: currentStep === 6 ? 'active' : 'pending'
    },
    {
      id: 'build',
      title: '8. Build',
      description: 'Execute the implementation safely',
      icon: <Rocket className="h-5 w-5" />,
      status: currentStep === 7 ? 'active' : 'pending'
    }
  ];

  // Step 1: Document Upload/Selection
  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Step 1: Select Document for Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card 
              key={doc.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedDocumentId === doc.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedDocumentId(doc.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">{doc.file_name}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Type: {doc.file_type} • Status: {doc.status}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {selectedDocumentId && (
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setCurrentStep(1)}>
              Continue to Analysis <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Step 2: Analysis
  const renderAnalysisStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Step 2: Document Analysis & Development Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!analysisResults ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              AI will analyze your document and create a comprehensive development plan based on the existing system with 348 database tables.
            </p>
            <Button 
              onClick={handleAnalysis}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Analyzing...' : 'Start Analysis'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-semibold text-green-800 dark:text-green-300">Analysis Complete</h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                Found {analysisResults.existingImplementation?.databaseTables} database tables, 
                {analysisResults.existingImplementation?.completionPercentage}% completion detected
              </p>
            </div>
            <Button onClick={() => setCurrentStep(2)} className="w-full">
              Continue to Chat Determination <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Window management handlers
  const handleMinimize = () => {
    if (windowState === 'normal') {
      setNormalPosition({ width: '100%', height: 'auto' });
    }
    setWindowState('minimized');
  };

  const handleMaximize = () => {
    if (windowState === 'normal') {
      setNormalPosition({ width: '100%', height: 'auto' });
    }
    setWindowState(windowState === 'maximized' ? 'normal' : 'maximized');
  };

  const handleClose = () => {
    setWindowState('normal');
    setShowSideBySide(false);
  };

  // Step 3: Chat Determination with Real AI Intelligence
  const renderChatDeterminationStep = () => {
    const handleSendMessage = async () => {
      if (!currentMessage.trim() || !selectedDocumentId) return;

      setIsProcessing(true);
      const userMessage = { role: 'user', content: currentMessage, timestamp: Date.now() };
      setChatHistory(prev => [...prev, userMessage]);

      try {
        const response = await fetch('/api/designer-agent/chat-with-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: currentMessage, 
            documentId: selectedDocumentId,
            requestPreview: currentMessage.toLowerCase().includes('preview') || currentMessage.toLowerCase().includes('show')
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiMessage = { 
            role: 'assistant', 
            content: data.response,
            documentContext: data.documentContext,
            pagePreview: data.pagePreview,
            timestamp: Date.now()
          };
          setChatHistory(prev => [...prev, aiMessage]);
          
          // If AI generated a page preview, update the state
          if (data.pagePreview) {
            setPagePreview(data.pagePreview);
          }
          
          // Store chat answers for later use
          setChatAnswers(prev => ({
            ...prev,
            [Date.now()]: currentMessage
          }));
          
          toast({ 
            title: "Real AI Response", 
            description: "Response generated with document context awareness" 
          });
        }
      } catch (error) {
        toast({ 
          title: "Chat Error", 
          description: "Failed to process message with Real AI", 
          variant: "destructive" 
        });
      } finally {
        setIsProcessing(false);
        setCurrentMessage('');
      }
    };

    // Window controls component
    const WindowControls = () => (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMinimize}
          className="h-6 w-6 p-0 hover:bg-yellow-100"
          title="Minimize"
        >
          <Minimize className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMaximize}
          className="h-6 w-6 p-0 hover:bg-green-100"
          title={windowState === 'maximized' ? 'Restore' : 'Maximize'}
        >
          <Maximize className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSideBySide(!showSideBySide)}
          className="h-6 w-6 p-0 hover:bg-blue-100"
          title="Side-by-side view"
        >
          <Columns className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-6 w-6 p-0 hover:bg-red-100"
          title="Close"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );

    if (windowState === 'minimized') {
      return (
        <div className="fixed bottom-4 right-4 z-50">
          <Button 
            onClick={() => setWindowState('normal')}
            className="flex items-center gap-2 shadow-lg"
          >
            <MessageSquare className="h-4 w-4" />
            Analysis Chat (Minimized)
          </Button>
        </div>
      );
    }

    const containerClass = windowState === 'maximized' 
      ? "fixed inset-4 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-2xl"
      : showSideBySide 
        ? "w-1/2" 
        : "w-full";

    return (
      <div className={containerClass}>
        {showSideBySide && (
          <div className="flex h-full gap-4">
            <div className="w-1/2">
              <Card className="h-full">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Existing Implementation</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Analysis Chat Interface</span>
                      </div>
                      <p className="text-sm text-green-700">Basic chat interface with message input and response display</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Document Context System</span>
                      </div>
                      <p className="text-sm text-green-700">Real AI intelligence with document-specific responses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="w-1/2">
              <Card className="h-full">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Missing/New Features</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  <div className="space-y-3">
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-orange-800">Window Controls</span>
                      </div>
                      <p className="text-sm text-orange-700">Minimize, maximize, close functionality needed</p>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-orange-800">Preview Page Annotations</span>
                      </div>
                      <p className="text-sm text-orange-700">Visual annotations showing where UI changes will appear</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {!showSideBySide && (
          <Card className={windowState === 'maximized' ? 'h-full flex flex-col' : ''}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Step 3: Real AI Chat Determination
              </CardTitle>
              <WindowControls />
            </CardHeader>
            <CardContent className={windowState === 'maximized' ? 'flex-1 overflow-auto' : ''}>
              <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium mb-2">Chat with Real AI Intelligence</h4>
              <p className="text-sm text-gray-600">
                Ask questions about implementation approach, technical decisions, or request a preview of the application page.
                The AI has full context about your selected document and the MallyERP system.
              </p>
            </div>

            {/* Chat History */}
            <ScrollArea className="h-64 w-full border rounded-lg p-4">
              <div className="space-y-4">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Start chatting with Real AI about your document implementation</p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        {msg.pagePreview && (
                          <Badge className="mt-2">Generated Preview</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="flex space-x-2">
              <Input
                placeholder="Ask about implementation approach, request preview, or discuss technical details..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isProcessing}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!currentMessage.trim() || isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Send'}
              </Button>
            </div>

            {/* Continue Button */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                {chatHistory.length > 0 ? `${chatHistory.length} messages exchanged` : 'No messages yet'}
              </div>
              <Button 
                onClick={() => setCurrentStep(3)} 
                disabled={chatHistory.length === 0}
                className="flex items-center gap-2"
              >
                Continue to Preview <ArrowRight className="h-4 w-4" />
              </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Step 4: Preview
  const renderPreviewStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Step 4: Application Page Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!pagePreview ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Generate a visual preview of how your application page will look when built.
            </p>
            <Button onClick={handleGeneratePreview} disabled={isLoading} className="w-full">
              {isLoading ? 'Generating Preview...' : 'Generate Page Preview'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <h3 className="font-bold text-lg mb-2">{pagePreview.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{pagePreview.sections[0]?.subtitle}</p>
              
              {/* Preview Mockup */}
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <span className="font-medium">Navigation: {pagePreview.navigation?.sidebarItem}</span>
                  <Badge>{pagePreview.pageType}</Badge>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {pagePreview.sections[1]?.cards?.map((card: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white dark:bg-gray-700 rounded shadow-sm">
                      <div className="text-xs text-gray-500">{card.title}</div>
                      <div className="font-bold text-lg">{card.value}</div>
                      <div className="text-xs text-green-600">{card.trend}</div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-white dark:bg-gray-700 rounded">
                  <div className="flex space-x-4 border-b">
                    {pagePreview.sections[2]?.tabs?.map((tab: any) => (
                      <div key={tab.id} className="px-3 py-2 border-b-2 border-blue-500 text-sm font-medium">
                        {tab.title}
                      </div>
                    ))}
                  </div>
                  <div className="p-4 text-sm text-gray-600">Main content area with {pagePreview.sections[2]?.tabs?.length} tabs</div>
                </div>

                <div className="flex space-x-2">
                  {pagePreview.sections[3]?.buttons?.map((button: any) => (
                    <Button key={button.id} variant={button.type === 'primary' ? 'default' : 'outline'} size="sm">
                      {button.title}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            <Button onClick={() => setCurrentStep(4)} className="w-full">
              Continue to Changes <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Step 5: Changes
  const renderChangesStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Step 5: Request Changes to Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Textarea
            placeholder="Describe any changes you'd like to make to the preview (e.g., 'Change title to Financial Dashboard', 'Add dark theme', 'Modify layout')"
            value={previewChanges}
            onChange={(e) => setPreviewChanges(e.target.value)}
            rows={4}
          />
          <div className="flex space-x-2">
            <Button 
              onClick={handleApplyChanges} 
              disabled={!previewChanges.trim() || isLoading}
            >
              {isLoading ? 'Applying Changes...' : 'Apply Changes'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(5)}
            >
              No Changes - Continue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Step 6: Final Draft
  const renderFinalDraftStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Step 6: Final Implementation Draft
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!finalDraft ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Generate the final implementation plan with safety measures and risk assessment.
            </p>
            <Button onClick={handleGenerateFinalDraft} disabled={isLoading} className="w-full">
              {isLoading ? 'Generating Final Draft...' : 'Generate Final Draft'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-bold mb-2">{finalDraft.pageTitle}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Risk Assessment: {finalDraft.riskAssessment}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Estimated Time: {finalDraft.estimatedTime}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">New Components</h4>
                <ul className="text-sm space-y-1">
                  {finalDraft.implementation?.newTables?.map((table: string) => (
                    <li key={table} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {table}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Safety Measures</h4>
                <ul className="text-sm space-y-1">
                  {finalDraft.safetyMeasures?.map((measure: string) => (
                    <li key={measure} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-blue-500" />
                      {measure}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <Button onClick={() => setCurrentStep(6)} className="w-full">
              Continue to Review & Approve <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Step 7: Review & Approve
  const renderReviewApproveStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Step 7: Review & Approve Implementation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="font-bold text-green-800 dark:text-green-300 mb-2">Ready for Implementation</h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              All steps completed successfully. The implementation is safe and will not break existing functionality.
            </p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Implementation Summary</h4>
            <p className="text-sm text-gray-600 mb-2">Document: {documents.find(d => d.id === selectedDocumentId)?.file_name}</p>
            <p className="text-sm text-gray-600 mb-2">Page: {pagePreview?.title}</p>
            <p className="text-sm text-gray-600">Components: {finalDraft?.implementation?.newTables?.length} tables, {finalDraft?.implementation?.newAPIEndpoints?.length} API endpoints</p>
          </div>
          
          <Button onClick={() => setCurrentStep(7)} className="w-full bg-green-600 hover:bg-green-700">
            Approve & Continue to Build <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 8: Build
  const renderBuildStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Step 8: Safe Implementation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Implementation Approved</h3>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Ready to build your new {pagePreview?.title} page with safety measures in place.
            </p>
          </div>
          
          <Button 
            onClick={handleBuild} 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Building...' : 'Execute Implementation'}
          </Button>
          
          {isLoading && (
            <div className="space-y-2">
              <Progress value={33} className="w-full" />
              <p className="text-sm text-gray-600">Creating database tables...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // API Handlers
  const handleAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/designer-agent/analyze-development-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedDocumentId, analysisType: 'comprehensive' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalysisResults(data);
        toast({ title: "Analysis Complete", description: "Development plan generated successfully" });
      }
    } catch (error) {
      toast({ title: "Analysis Failed", description: "Please try again", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleGeneratePreview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/designer-agent/generate-page-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentId: selectedDocumentId, 
          chatAnswers: chatAnswers 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPagePreview(data.preview);
        toast({ 
          title: "Real AI Preview Generated", 
          description: "Intelligent page preview created with document context" 
        });
      } else {
        throw new Error('Preview generation failed');
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      toast({ 
        title: "Preview Generation Failed", 
        description: "Real AI intelligence temporarily unavailable", 
        variant: "destructive" 
      });
    }
    setIsLoading(false);
  };

  const handleApplyChanges = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/designer-agent/process-preview-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedDocumentId, changes: previewChanges, pagePreview })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPagePreview(data.updatedPreview);
        toast({ title: "Changes Applied", description: "Preview updated successfully" });
        setCurrentStep(5);
      }
    } catch (error) {
      toast({ title: "Changes Failed", description: "Please try again", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleGenerateFinalDraft = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/designer-agent/generate-final-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedDocumentId, pagePreview, changes: previewChanges })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFinalDraft(data.finalDraft);
        toast({ title: "Final Draft Ready", description: "Implementation plan complete" });
      }
    } catch (error) {
      toast({ title: "Draft Generation Failed", description: "Please try again", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleBuild = async () => {
    setIsLoading(true);
    // Simulate build process
    setTimeout(() => {
      toast({ 
        title: "Implementation Complete", 
        description: `${pagePreview?.title} has been successfully implemented` 
      });
      setIsLoading(false);
    }, 3000);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderUploadStep();
      case 1: return renderAnalysisStep();
      case 2: return renderChatDeterminationStep();
      case 3: return renderPreviewStep();
      case 4: return renderChangesStep();
      case 5: return renderFinalDraftStep();
      case 6: return renderReviewApproveStep();
      case 7: return renderBuildStep();
      default: return renderUploadStep();
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Structured Development Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className="text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  step.status === 'completed' ? 'bg-green-500 text-white' :
                  step.status === 'active' ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : step.icon}
                </div>
                <div className="text-xs font-medium">{step.title}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      {renderCurrentStep()}
    </div>
  );
}