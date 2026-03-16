/**
 * DEVELOPMENT SAFETY DASHBOARD
 * Comprehensive system for safe development with preview, rollback, and break-prevention
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Eye, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  Database,
  Code,
  Layers,
  Clock,
  TrendingUp,
  Activity,
  Camera,
  Play,
  Pause,
  FileText,
  Zap
} from 'lucide-react';

interface FeatureDetails {
  id: string;
  title: string;
  description: string;
  implementation: {
    type: 'ui' | 'api' | 'database' | 'integration';
    components: string[];
    dependencies: string[];
    riskLevel: 'low' | 'medium' | 'high';
    estimatedTime: string;
    breakingChanges: boolean;
    affectedModules: string[];
  };
  preview: {
    mockups: any[];
    dataFlow: string[];
    integrationPoints: string[];
  };
}

interface SystemSnapshot {
  id: string;
  timestamp: string;
  description: string;
  checksum: string;
}

interface SafetyCheck {
  safetyScore: number;
  checks: any;
  recommendations: string[];
  canProceed: boolean;
  warnings: string[];
  criticalIssues: string[];
}

interface DevelopmentSafetyDashboardProps {
  selectedFeatures: number[];
  comparisonResult: any;
  onAnalyzeFeatures: (features: number[]) => void;
  onGeneratePreview: (details: any) => void;
  onCreateSnapshot: (description: string) => void;
  onRunSafetyCheck: (details: any) => void;
}

export function DevelopmentSafetyDashboard({ 
  selectedFeatures, 
  comparisonResult, 
  onAnalyzeFeatures,
  onGeneratePreview,
  onCreateSnapshot,
  onRunSafetyCheck
}: DevelopmentSafetyDashboardProps) {
  const [featureDetails, setFeatureDetails] = useState<FeatureDetails[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<SystemSnapshot[]>([]);
  const [safetyCheck, setSafetyCheck] = useState<SafetyCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('features');

  // 1. FEATURE REQUIREMENTS ANALYZER
  const analyzeFeatures = async () => {
    if (selectedFeatures.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/designer-agent/analyze-feature-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedFeatures, comparisonResult })
      });
      
      const data = await response.json();
      if (data.success) {
        setFeatureDetails(data.featureDetails);
        setActiveTab('features');
      }
    } catch (error) {
      console.error('Feature analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. IMPLEMENTATION PREVIEW GENERATOR
  const generatePreview = async () => {
    if (featureDetails.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/designer-agent/generate-implementation-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureDetails })
      });
      
      const data = await response.json();
      if (data.success) {
        setPreviewData(data.preview);
        setActiveTab('preview');
      }
    } catch (error) {
      console.error('Preview generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 3. SYSTEM SNAPSHOT MANAGEMENT
  const createSnapshot = async () => {
    const description = `Pre-implementation snapshot - ${new Date().toLocaleString()}`;
    
    setLoading(true);
    try {
      const response = await fetch('/api/designer-agent/create-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      
      const data = await response.json();
      if (data.success) {
        await loadSnapshots();
        setActiveTab('snapshots');
      }
    } catch (error) {
      console.error('Snapshot creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSnapshots = async () => {
    try {
      const response = await fetch('/api/designer-agent/snapshots');
      const data = await response.json();
      if (data.success) {
        setSnapshots(data.snapshots);
      }
    } catch (error) {
      console.error('Load snapshots error:', error);
    }
  };

  const rollbackToSnapshot = async (snapshotId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/designer-agent/rollback-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('System rollback completed successfully!');
      }
    } catch (error) {
      console.error('Rollback error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 4. BREAK-PREVENTION AGENT
  const runSafetyCheck = async () => {
    if (featureDetails.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/designer-agent/run-break-prevention-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureDetails })
      });
      
      const data = await response.json();
      if (data.success) {
        setSafetyCheck(data.safetyCheck);
        setActiveTab('safety');
      }
    } catch (error) {
      console.error('Safety check error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ui': return <Layers className="h-4 w-4" />;
      case 'api': return <Code className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'integration': return <Zap className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Development Safety System
          </h2>
          <p className="text-gray-600">
            Comprehensive safety controls for secure development and deployment
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={analyzeFeatures}
            disabled={selectedFeatures.length === 0 || loading}
            className="flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Analyze Features ({selectedFeatures.length})
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-600">Features Selected</div>
                <div className="text-2xl font-bold">{selectedFeatures.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm text-gray-600">Preview Ready</div>
                <div className="text-2xl font-bold">{previewData ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-sm text-gray-600">Snapshots</div>
                <div className="text-2xl font-bold">{snapshots.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-sm text-gray-600">Safety Score</div>
                <div className="text-2xl font-bold">
                  {safetyCheck ? `${safetyCheck.safetyScore}%` : 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="features" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Feature Analysis
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Implementation Preview
          </TabsTrigger>
          <TabsTrigger value="snapshots" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            System Snapshots
          </TabsTrigger>
          <TabsTrigger value="safety" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Safety Checks
          </TabsTrigger>
        </TabsList>

        {/* Feature Analysis Tab */}
        <TabsContent value="features" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Feature Requirements Analysis</h3>
            <div className="flex gap-2">
              <Button 
                onClick={generatePreview}
                disabled={featureDetails.length === 0 || loading}
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>
              <Button 
                onClick={runSafetyCheck}
                disabled={featureDetails.length === 0 || loading}
                variant="outline"
              >
                <Shield className="h-4 w-4 mr-2" />
                Run Safety Check
              </Button>
            </div>
          </div>

          {featureDetails.length > 0 ? (
            <div className="grid gap-4">
              {featureDetails.map((feature, index) => (
                <Card key={feature.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {getTypeIcon(feature.implementation.type)}
                          {feature.title}
                        </CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </div>
                      <Badge className={getRiskColor(feature.implementation.riskLevel)}>
                        {feature.implementation.riskLevel} risk
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Implementation Type</h4>
                        <Badge variant="outline" className="capitalize">
                          {feature.implementation.type}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2">Estimated Time</h4>
                        <div className="text-sm text-gray-600">{feature.implementation.estimatedTime}</div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2">Breaking Changes</h4>
                        <Badge variant={feature.implementation.breakingChanges ? "destructive" : "default"}>
                          {feature.implementation.breakingChanges ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Required Components</h4>
                        <div className="space-y-1">
                          {feature.implementation.components.map((comp, idx) => (
                            <Badge key={idx} variant="secondary" className="mr-1 mb-1">
                              {comp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2">Affected Modules</h4>
                        <div className="space-y-1">
                          {feature.implementation.affectedModules.map((module, idx) => (
                            <Badge key={idx} variant="outline" className="mr-1 mb-1">
                              {module}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Features Analyzed</h3>
                <p className="text-gray-600 mb-4">
                  Select features from the comparison results and click "Analyze Features" to get detailed requirements.
                </p>
                <Button 
                  onClick={analyzeFeatures}
                  disabled={selectedFeatures.length === 0}
                >
                  Analyze Selected Features
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Implementation Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Implementation Preview</h3>
            <Button 
              onClick={createSnapshot}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Create Snapshot Before Implementation
            </Button>
          </div>

          {previewData ? (
            <div className="space-y-4">
              {/* Overview Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Implementation Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Total Features</div>
                      <div className="text-2xl font-bold">{previewData.overview.totalFeatures}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Risk Assessment</div>
                      <Badge className={getRiskColor(previewData.overview.riskAssessment)}>
                        {previewData.overview.riskAssessment}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Estimated Time</div>
                      <div className="text-lg font-semibold">{previewData.overview.estimatedTime}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Affected Systems</div>
                      <div className="text-lg font-semibold">{previewData.overview.affectedSystems.length}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Features Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Feature Implementation Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {previewData.features.map((feature: any, index: number) => (
                      <div key={feature.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            {getTypeIcon(feature.type)}
                            {feature.title}
                          </h4>
                          <Badge className={getRiskColor(feature.riskLevel)}>
                            {feature.riskLevel}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="text-sm font-medium mb-2">Components</h5>
                            <div className="space-y-1">
                              {feature.components.map((comp: string, idx: number) => (
                                <div key={idx} className="text-sm text-gray-600">• {comp}</div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-2">Implementation Steps</h5>
                            <div className="space-y-1">
                              {feature.implementationSteps.map((step: string, idx: number) => (
                                <div key={idx} className="text-sm text-gray-600">
                                  {idx + 1}. {step}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Safety Checks */}
              <Card>
                <CardHeader>
                  <CardTitle>Safety Checks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">Potential Issues</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {previewData.safetyChecks.breakingChanges ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm">
                            Breaking Changes: {previewData.safetyChecks.breakingChanges ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {previewData.safetyChecks.dependencyConflicts ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm">
                            Dependency Conflicts: {previewData.safetyChecks.dependencyConflicts ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Recommendations</h5>
                      <div className="space-y-1">
                        {previewData.recommendations.map((rec: string, idx: number) => (
                          <div key={idx} className="text-sm text-gray-600">• {rec}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Preview Generated</h3>
                <p className="text-gray-600 mb-4">
                  Analyze features first, then generate implementation preview to see what will be built.
                </p>
                <Button 
                  onClick={generatePreview}
                  disabled={featureDetails.length === 0}
                >
                  Generate Implementation Preview
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* System Snapshots Tab */}
        <TabsContent value="snapshots" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">System Snapshots</h3>
            <Button 
              onClick={createSnapshot}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Create New Snapshot
            </Button>
          </div>

          {snapshots.length > 0 ? (
            <div className="space-y-3">
              {snapshots.map((snapshot) => (
                <Card key={snapshot.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{snapshot.description}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(snapshot.timestamp).toLocaleString()}
                          </span>
                          <span>ID: {snapshot.id}</span>
                          <span>Checksum: {snapshot.checksum}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rollbackToSnapshot(snapshot.id)}
                        disabled={loading}
                        className="flex items-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Rollback
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Snapshots Available</h3>
                <p className="text-gray-600 mb-4">
                  Create system snapshots before implementing changes to enable rollback if needed.
                </p>
                <Button onClick={createSnapshot} disabled={loading}>
                  Create First Snapshot
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Safety Checks Tab */}
        <TabsContent value="safety" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Break-Prevention Safety Checks</h3>
            <Button 
              onClick={runSafetyCheck}
              disabled={featureDetails.length === 0 || loading}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Run Safety Check
            </Button>
          </div>

          {safetyCheck ? (
            <div className="space-y-4">
              {/* Safety Score */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
                      <Shield className={`h-8 w-8 ${safetyCheck.safetyScore >= 80 ? 'text-green-500' : safetyCheck.safetyScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`} />
                      {safetyCheck.safetyScore}%
                    </div>
                    <div className="text-gray-600 mb-4">Overall Safety Score</div>
                    <Progress value={safetyCheck.safetyScore} className="mb-4" />
                    <Badge 
                      variant={safetyCheck.canProceed ? "default" : "destructive"}
                      className="text-sm"
                    >
                      {safetyCheck.canProceed ? "Safe to Proceed" : "Review Required"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Checks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(safetyCheck.checks).map(([checkName, checkResult]: [string, any]) => (
                  <Card key={checkName}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">
                          {checkName.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <Badge 
                          variant={checkResult.status === 'pass' ? "default" : "destructive"}
                        >
                          {checkResult.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Score: {checkResult.score}%
                      </div>
                      <Progress value={checkResult.score} className="mb-2" />
                      {checkResult.issues.length > 0 && (
                        <div className="text-sm">
                          <div className="font-medium text-red-600">Issues:</div>
                          <ul className="list-disc list-inside text-gray-600">
                            {checkResult.issues.map((issue: string, idx: number) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Warnings and Recommendations */}
              {(safetyCheck.warnings.length > 0 || safetyCheck.criticalIssues.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {safetyCheck.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Warnings</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {safetyCheck.warnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {safetyCheck.criticalIssues.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Critical Issues</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {safetyCheck.criticalIssues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Safety Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {safetyCheck.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Safety Check Performed</h3>
                <p className="text-gray-600 mb-4">
                  Run break-prevention checks to ensure implementation won't break existing functionality.
                </p>
                <Button 
                  onClick={runSafetyCheck}
                  disabled={featureDetails.length === 0}
                >
                  Run Safety Check
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Processing safety checks...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}