import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Clock, AlertTriangle, FileText, Database, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingAnalysis {
  id: number;
  document_id: number;
  analysis_type: string;
  status: string;
  implementation_plan: any;
  proposed_table_changes: any;
  proposed_ui_changes: any;
  created_at: string;
}

export default function ReviewAndApproveSection() {
  const [pendingAnalyses, setPendingAnalyses] = useState<PendingAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingAnalyses();
  }, []);

  const fetchPendingAnalyses = async () => {
    try {
      const response = await fetch('/api/designer-agent/pending-reviews');
      if (response.ok) {
        const data = await response.json();
        console.log('Successfully fetched analyses:', data?.length || 0);
        setPendingAnalyses(data || []);
      } else {
        console.error('Failed to fetch pending analyses');
      }
    } catch (error) {
      console.error('Error fetching pending analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (analysisId: number) => {
    try {
      const response = await fetch('/api/designer-agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          status: 'approved',
          reviewedBy: 'System Administrator',
          comments: 'Approved for implementation based on chat analysis'
        })
      });

      if (response.ok) {
        toast({
          title: "Implementation Approved",
          description: "Analysis has been approved and sent for implementation.",
        });
        fetchPendingAnalyses(); // Refresh the list
      } else {
        throw new Error('Approval failed');
      }
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: "Failed to approve implementation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRequestChanges = async (analysisId: number) => {
    try {
      const response = await fetch('/api/designer-agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          status: 'changes_requested',
          reviewedBy: 'System Administrator',
          comments: 'Changes requested for further review and refinement'
        })
      });

      if (response.ok) {
        toast({
          title: "Changes Requested",
          description: "Analysis has been marked for revision.",
        });
        fetchPendingAnalyses(); // Refresh the list
      } else {
        throw new Error('Request changes failed');
      }
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Failed to request changes. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading pending analyses...</span>
      </div>
    );
  }

  if (pendingAnalyses.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No completed analysis available for review</h3>
        <p className="text-gray-600 mb-6">You have uploaded documents. Start analysis first.</p>
        <Button variant="outline" onClick={() => window.location.hash = '#analyze'}>
          Go to Analysis Tab
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Review & Approve</h2>
        <Badge variant="secondary">{pendingAnalyses.length} Pending Reviews</Badge>
      </div>

      {pendingAnalyses.map((analysis) => (
        <Card key={analysis.id} className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat Instruction Analysis #{analysis.id}
              </CardTitle>
              <Badge variant={analysis.status === 'pending_review' ? 'default' : 'secondary'}>
                {analysis.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Created: {new Date(analysis.created_at).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Implementation Plan */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Implementation Requirements
                </h4>
                <ScrollArea className="h-32 border rounded p-3 bg-gray-50">
                  <div className="text-sm">
                    {analysis.implementation_plan && (() => {
                      try {
                        const plan = typeof analysis.implementation_plan === 'string' 
                          ? JSON.parse(analysis.implementation_plan) 
                          : analysis.implementation_plan;
                        return (
                          <div className="space-y-2">
                            <p><strong>Priority:</strong> {plan.priority || 'Medium'}</p>
                            <p><strong>Document:</strong> {plan.documentName}</p>
                            <p><strong>Effort:</strong> {plan.estimatedEffort}</p>
                            <p><strong>Risk:</strong> {plan.riskLevel}</p>
                          </div>
                        );
                      } catch (e) {
                        return <p>Error displaying implementation plan</p>;
                      }
                    })()}
                  </div>
                </ScrollArea>
              </div>

              {/* Database Changes */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Proposed Database Changes
                </h4>
                <ScrollArea className="h-24 border rounded p-3 bg-blue-50">
                  <div className="text-sm">
                    {analysis.proposed_table_changes && (() => {
                      try {
                        const changes = typeof analysis.proposed_table_changes === 'string' 
                          ? JSON.parse(analysis.proposed_table_changes) 
                          : analysis.proposed_table_changes;
                        return (
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(changes, null, 2)}
                          </pre>
                        );
                      } catch (e) {
                        return <p>Error displaying table changes</p>;
                      }
                    })()}
                  </div>
                </ScrollArea>
              </div>

              {/* UI Changes */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Proposed UI Changes
                </h4>
                <ScrollArea className="h-24 border rounded p-3 bg-green-50">
                  <div className="text-sm">
                    {analysis.proposed_ui_changes && (() => {
                      try {
                        const changes = typeof analysis.proposed_ui_changes === 'string' 
                          ? JSON.parse(analysis.proposed_ui_changes) 
                          : analysis.proposed_ui_changes;
                        return (
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(changes, null, 2)}
                          </pre>
                        );
                      } catch (e) {
                        return <p>Error displaying UI changes</p>;
                      }
                    })()}
                  </div>
                </ScrollArea>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={() => handleApprove(analysis.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Implementation
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleRequestChanges(analysis.id)}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}