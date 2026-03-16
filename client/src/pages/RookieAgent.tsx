import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  GraduationCap, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  BookOpen, 
  FileCheck, 
  HelpCircle,
  TrendingUp,
  Clock,
  Target,
  Star
} from "lucide-react";

export default function RookieAgent() {
  const [selectedDomain, setSelectedDomain] = useState('finance');
  const [searchTerm, setSearchTerm] = useState('');
  const [validationData, setValidationData] = useState({
    domain: 'finance',
    screenName: '',
    fieldName: '',
    fieldValue: '',
    description: '',
    validationType: 'format_check'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dashboard data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/rookie-agent/dashboard'],
  });

  // Fetch business domain data
  const { data: domainData, isLoading: domainLoading } = useQuery({
    queryKey: ['/api/rookie-agent/business-domain', selectedDomain],
    enabled: !!selectedDomain,
  });

  // Fetch training materials
  const { data: trainingData, isLoading: trainingLoading } = useQuery({
    queryKey: ['/api/rookie-agent/training', selectedDomain],
    enabled: !!selectedDomain,
  });

  // Fetch quality checks
  const { data: qualityChecks, isLoading: qualityLoading } = useQuery({
    queryKey: ['/api/rookie-agent/quality-checks', selectedDomain],
    enabled: !!selectedDomain,
  });

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async () => {
      if (!searchTerm.trim()) return null;
      return await apiRequest(`/api/rookie-agent/search/${selectedDomain}/${encodeURIComponent(searchTerm)}`);
    },
    onSuccess: () => {
      toast({
        title: "Search completed",
        description: "Found relevant data in the system",
      });
    },
  });

  // Data validation mutation
  const validateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/rookie-agent/validate-entry', {
        method: 'POST',
        body: JSON.stringify(validationData),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (result) => {
      toast({
        title: result.isValid ? "Validation passed" : "Validation failed",
        description: result.isValid ? "Data entry is valid" : "Please review the validation details",
        variant: result.isValid ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rookie-agent/dashboard'] });
    },
  });

  const handleSearch = () => {
    searchMutation.mutate();
  };

  const handleValidation = () => {
    validateMutation.mutate();
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Rookie Agent dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            Rookie Agent - Business Domain Support
          </h1>
          <p className="text-gray-600 mt-2">
            Learning level agent providing data entry support, training, and quality checks
          </p>
        </div>
        <Badge variant="outline" className="text-green-700 border-green-300">
          Learning Level
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recent Sessions</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboard?.recentSessions?.length || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Validations</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {dashboard?.pendingValidations?.length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Data Accuracy</p>
                <p className="text-2xl font-bold text-blue-600">
                  {dashboard?.qualityMetrics?.dataAccuracy || 0}%
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">User Rating</p>
                <p className="text-2xl font-bold text-purple-600">
                  {dashboard?.qualityMetrics?.userSatisfaction || 0}/5
                </p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="data-entry">Data Entry Support</TabsTrigger>
          <TabsTrigger value="search">Screen Data Search</TabsTrigger>
          <TabsTrigger value="training">Training Materials</TabsTrigger>
          <TabsTrigger value="quality">Quality Checks</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Business Domains */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Supported Business Domains
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {dashboard?.businessDomains?.map((domain: string) => (
                    <Button
                      key={domain}
                      variant={selectedDomain === domain ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDomain(domain)}
                      className="justify-start"
                    >
                      {domain.charAt(0).toUpperCase() + domain.slice(1)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Supported Functions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Support Functions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboard?.supportedFunctions?.map((func: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{func}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Training Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Training Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard?.trainingProgress?.slice(0, 5).map((training: any) => (
                  <div key={training.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{training.title}</p>
                      <p className="text-sm text-gray-600">
                        {training.businessDomain} • {training.difficulty}
                      </p>
                    </div>
                    <div className="text-right">
                      <Progress value={training.completionRate || 0} className="w-20 mb-1" />
                      <p className="text-xs text-gray-500">{training.completionRate || 0}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Entry Support Tab */}
        <TabsContent value="data-entry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Data Entry Validation
              </CardTitle>
              <CardDescription>
                Validate data entries with real-time business rule checking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Business Domain</label>
                  <Select value={validationData.domain} onValueChange={(value) => 
                    setValidationData(prev => ({ ...prev, domain: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dashboard?.businessDomains?.map((domain: string) => (
                        <SelectItem key={domain} value={domain}>
                          {domain.charAt(0).toUpperCase() + domain.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Validation Type</label>
                  <Select value={validationData.validationType} onValueChange={(value) => 
                    setValidationData(prev => ({ ...prev, validationType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="format_check">Format Check</SelectItem>
                      <SelectItem value="business_rule">Business Rule</SelectItem>
                      <SelectItem value="quality_check">Quality Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Screen Name</label>
                  <Input
                    value={validationData.screenName}
                    onChange={(e) => setValidationData(prev => ({ ...prev, screenName: e.target.value }))}
                    placeholder="e.g., Customer Master"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Field Name</label>
                  <Input
                    value={validationData.fieldName}
                    onChange={(e) => setValidationData(prev => ({ ...prev, fieldName: e.target.value }))}
                    placeholder="e.g., Customer Code"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Field Value</label>
                <Input
                  value={validationData.fieldValue}
                  onChange={(e) => setValidationData(prev => ({ ...prev, fieldValue: e.target.value }))}
                  placeholder="Enter the value to validate"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={validationData.description}
                  onChange={(e) => setValidationData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description of the data entry"
                  rows={3}
                />
              </div>

              <Button onClick={handleValidation} disabled={validateMutation.isPending} className="w-full">
                {validateMutation.isPending ? 'Validating...' : 'Validate Data Entry'}
              </Button>

              {validateMutation.data && (
                <div className={`p-4 rounded border ${validateMutation.data.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {validateMutation.data.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {validateMutation.data.isValid ? 'Validation Passed' : 'Validation Failed'}
                    </span>
                  </div>
                  {validateMutation.data.recommendations?.map((rec: string, index: number) => (
                    <p key={index} className="text-sm text-gray-600">• {rec}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Screen Data Search
              </CardTitle>
              <CardDescription>
                Search across posted data in UI screens for the selected business domain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboard?.businessDomains?.map((domain: string) => (
                      <SelectItem key={domain} value={domain}>
                        {domain.charAt(0).toUpperCase() + domain.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for data in screens..."
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                  {searchMutation.isPending ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {searchMutation.data && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Search Results</h3>
                    <Badge variant="outline">
                      {searchMutation.data.totalFound} results found
                    </Badge>
                  </div>
                  
                  {searchMutation.data.results?.length > 0 ? (
                    <div className="space-y-2">
                      {searchMutation.data.results.map((result: any, index: number) => (
                        <div key={index} className="p-3 border rounded">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{result.screen}</span>
                            <Badge variant="secondary" size="sm">{result.type}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            <strong>{result.field}:</strong> {result.value}
                          </p>
                          {result.description && (
                            <p className="text-xs text-gray-500 mt-1">{result.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No results found for "{searchTerm}"</p>
                      {searchMutation.data.searchSuggestions?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm mb-2">Try these suggestions:</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {searchMutation.data.searchSuggestions.map((suggestion: string, index: number) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => setSearchTerm(suggestion)}
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Domain Screens Info */}
              {domainData && !domainLoading && (
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Available Screens in {selectedDomain}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {domainData.screens?.map((screen: any, index: number) => (
                      <div key={index} className="p-3 border rounded">
                        <p className="font-medium">{screen.screen}</p>
                        <p className="text-sm text-gray-600">{screen.dataCount} records</p>
                        <p className="text-xs text-gray-500">
                          Updated: {new Date(screen.lastUpdate).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Training Materials - {selectedDomain.charAt(0).toUpperCase() + selectedDomain.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trainingLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p>Loading training materials...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Quick Start Guide */}
                  <div>
                    <h3 className="font-medium mb-3 text-green-700">Quick Start Guide</h3>
                    <div className="space-y-2">
                      {trainingData?.quickStart?.map((item: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                          <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Common Tasks */}
                  <div>
                    <h3 className="font-medium mb-3 text-blue-700">Common Tasks</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {trainingData?.commonTasks?.map((task: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Best Practices */}
                  <div>
                    <h3 className="font-medium mb-3 text-purple-700">Best Practices</h3>
                    <div className="space-y-2">
                      {trainingData?.bestPractices?.map((practice: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                          <Star className="h-4 w-4 text-purple-600" />
                          <span className="text-sm">{practice}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Training Materials */}
                  {trainingData?.materials?.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">Available Training Materials</h3>
                      <div className="space-y-3">
                        {trainingData.materials.map((material: any) => (
                          <div key={material.id} className="p-4 border rounded">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium">{material.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{material.content}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <Badge variant="outline" size="sm">{material.difficulty}</Badge>
                                  <span className="text-xs text-gray-500">
                                    {material.estimatedDuration} minutes
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {material.trainingType}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <Progress value={material.completionRate || 0} className="w-20 mb-1" />
                                <p className="text-xs text-gray-500">{material.completionRate || 0}%</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Checks Tab */}
        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Quality Checks - {selectedDomain.charAt(0).toUpperCase() + selectedDomain.slice(1)}
              </CardTitle>
              <CardDescription>
                Quality assurance guidelines and validation criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qualityLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p>Loading quality checks...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Quality Guidelines */}
                  <div>
                    <h3 className="font-medium mb-3 text-blue-700">Quality Guidelines</h3>
                    <div className="space-y-2">
                      {qualityChecks?.guidelines?.map((guideline: string, index: number) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                          <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                          <span className="text-sm">{guideline}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div>
                    <h3 className="font-medium mb-3 text-green-700">Quality Checklist</h3>
                    <div className="space-y-2">
                      {qualityChecks?.checklistItems?.map((item: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quality Checks */}
                  {qualityChecks?.checks?.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">Quality Check Definitions</h3>
                      <div className="space-y-3">
                        {qualityChecks.checks.map((check: any) => (
                          <div key={check.id} className="p-4 border rounded">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium">{check.checkName}</h4>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={check.severity === 'critical' ? 'destructive' : 
                                          check.severity === 'high' ? 'default' : 'secondary'}
                                  size="sm"
                                >
                                  {check.severity}
                                </Badge>
                                {check.autoCheck && (
                                  <Badge variant="outline" size="sm">Auto</Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{check.checkDescription}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                Type: {check.checkType}
                              </span>
                              {check.passingScore && (
                                <span className="text-xs text-gray-500">
                                  Passing Score: {check.passingScore}%
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}