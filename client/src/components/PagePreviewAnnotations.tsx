import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Edit, Trash2, Move, Eye, ArrowRight } from 'lucide-react';

interface AnnotationPoint {
  id: string;
  x: number;
  y: number;
  type: 'add' | 'modify' | 'remove';
  title: string;
  description: string;
  component: string;
}

interface PagePreviewAnnotationsProps {
  existingPageUrl?: string;
  documentContext?: any;
  previewData?: any;
}

export default function PagePreviewAnnotations({ 
  existingPageUrl, 
  documentContext, 
  previewData 
}: PagePreviewAnnotationsProps) {
  const [annotations, setAnnotations] = useState<AnnotationPoint[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);

  // Sample annotations based on the user's screenshot requirements
  useEffect(() => {
    const sampleAnnotations: AnnotationPoint[] = [
      {
        id: 'ann1',
        x: 25,
        y: 15,
        type: 'add',
        title: 'Window Controls',
        description: 'Add minimize, maximize, close buttons to chat interface',
        component: 'WindowControls'
      },
      {
        id: 'ann2',
        x: 75,
        y: 20,
        type: 'add',
        title: 'Side-by-Side Toggle',
        description: 'Add button to enable side-by-side comparison view',
        component: 'SideBySideToggle'
      },
      {
        id: 'ann3',
        x: 50,
        y: 60,
        title: 'Enhanced Chat Area',
        type: 'modify',
        description: 'Enhance existing chat interface with Real AI intelligence integration',
        component: 'ChatInterface'
      },
      {
        id: 'ann4',
        x: 80,
        y: 85,
        type: 'add',
        title: 'Preview Generation',
        description: 'Add preview button that shows page mockup with annotations',
        component: 'PreviewButton'
      }
    ];
    setAnnotations(sampleAnnotations);
  }, [documentContext]);

  const getAnnotationIcon = (type: string) => {
    switch (type) {
      case 'add': return <Plus className="h-3 w-3" />;
      case 'modify': return <Edit className="h-3 w-3" />;
      case 'remove': return <Trash2 className="h-3 w-3" />;
      default: return <MapPin className="h-3 w-3" />;
    }
  };

  const getAnnotationColor = (type: string) => {
    switch (type) {
      case 'add': return 'bg-green-500 border-green-600';
      case 'modify': return 'bg-blue-500 border-blue-600';
      case 'remove': return 'bg-red-500 border-red-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Page Preview with UI Change Annotations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium mb-2">Existing Page Screenshot Analysis</h4>
              <p className="text-sm text-gray-600 mb-3">
                Based on your uploaded screenshot, here's where the new UI changes will be implemented:
              </p>
              
              {/* Simulated existing page with annotations */}
              <div className="relative border-2 border-gray-300 rounded-lg bg-white p-4 min-h-[400px]">
                {/* Existing page mockup based on user's screenshot */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2 relative">
                    <h3 className="font-semibold">Analysis Chat</h3>
                    
                    {/* Annotation for window controls */}
                    <div
                      className={`absolute right-0 -top-2 w-6 h-6 rounded-full border-2 ${getAnnotationColor('add')} text-white flex items-center justify-center cursor-pointer z-10`}
                      onClick={() => setSelectedAnnotation('ann1')}
                      title="Click to see details"
                    >
                      {getAnnotationIcon('add')}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    Ask questions about your ERP system, uploaded document, or analysis results
                  </p>
                  
                  {/* Existing chat area with modification annotation */}
                  <div className="relative border rounded p-3 bg-gray-50 min-h-[200px]">
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">
                        - Conduct thorough testing of the integration processes to validate data accuracy and system performance...
                      </div>
                      <div className="text-sm text-gray-500">
                        8. **Documentation and Training:**
                      </div>
                      <div className="text-sm text-gray-500">
                        - Update the documentation to reflect any changes made to the integration cycle...
                      </div>
                    </div>
                    
                    {/* Annotation for chat enhancement */}
                    <div
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 ${getAnnotationColor('modify')} text-white flex items-center justify-center cursor-pointer z-10`}
                      onClick={() => setSelectedAnnotation('ann3')}
                      title="Click to see details"
                    >
                      {getAnnotationIcon('modify')}
                    </div>
                  </div>
                  
                  {/* Input area with preview button annotation */}
                  <div className="relative flex gap-2">
                    <input 
                      className="flex-1 border rounded px-3 py-2 text-sm" 
                      placeholder="Ask about ERP tables, document requirements, or integration points..."
                      disabled
                    />
                    <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
                      Send
                    </button>
                    
                    {/* Annotation for new preview button */}
                    <div
                      className={`absolute -right-8 top-2 w-6 h-6 rounded-full border-2 ${getAnnotationColor('add')} text-white flex items-center justify-center cursor-pointer z-10`}
                      onClick={() => setSelectedAnnotation('ann4')}
                      title="Click to see details"
                    >
                      {getAnnotationIcon('add')}
                    </div>
                  </div>
                </div>
                
                {/* Side-by-side toggle annotation */}
                <div
                  className={`absolute top-4 right-20 w-6 h-6 rounded-full border-2 ${getAnnotationColor('add')} text-white flex items-center justify-center cursor-pointer z-10`}
                  onClick={() => setSelectedAnnotation('ann2')}
                  title="Click to see details"
                >
                  {getAnnotationIcon('add')}
                </div>
              </div>
            </div>
            
            {/* Annotation Details Panel */}
            {selectedAnnotation && (
              <Card className="border-l-4 border-blue-500">
                <CardContent className="pt-4">
                  {(() => {
                    const annotation = annotations.find(a => a.id === selectedAnnotation);
                    if (!annotation) return null;
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={annotation.type === 'add' ? 'default' : annotation.type === 'modify' ? 'secondary' : 'destructive'}>
                            {annotation.type.toUpperCase()}
                          </Badge>
                          <h4 className="font-medium">{annotation.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600">{annotation.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>Component:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded">{annotation.component}</code>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedAnnotation(null)}
                          variant="outline"
                        >
                          Close Details
                        </Button>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
            
            {/* Annotations Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">UI Change Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <Plus className="h-2 w-2 text-white" />
                    </div>
                    <span>New Feature</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <Edit className="h-2 w-2 text-white" />
                    </div>
                    <span>Enhancement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                      <Trash2 className="h-2 w-2 text-white" />
                    </div>
                    <span>Remove/Replace</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Implementation Summary */}
            <Card className="bg-green-50 dark:bg-green-900/20">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-green-800">Implementation Summary</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <div>• Window controls (minimize, maximize, close) will be added to the top-right corner</div>
                    <div>• Side-by-side view toggle will enable comparison between existing and new features</div>
                    <div>• Chat interface will be enhanced with Real AI intelligence integration</div>
                    <div>• Preview functionality will be added to visualize page changes before implementation</div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="outline">4 Changes Total</Badge>
                    <Badge variant="outline">3 Additions</Badge>
                    <Badge variant="outline">1 Enhancement</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}