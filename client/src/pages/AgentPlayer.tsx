import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Brain, CheckCircle, AlertTriangle, Settings, Users, ArrowLeftRight, FileText, Activity } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AgentPlayer {
  id: string;
  name: string;
  businessDomain: string;
  playerType: string;
  configurationAccess: string[];
  standardsFramework: any;
  neighborDomains: string[];
  status: string;
  isActive: boolean;
}

interface ValidationResult {
  id: string;
  configurationArea: string;
  validationType: string;
  validationRule: string;
  complianceStatus: string;
  lastChecked: string;
}

export default function AgentPlayer() {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch all agent players
  const { data: players = [], isLoading: playersLoading } = useQuery<AgentPlayer[]>({
    queryKey: ['/api/agent-players'],
  });

  // Fetch selected player details
  const { data: playerDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['/api/agent-players', selectedPlayer],
    enabled: !!selectedPlayer,
  });

  // Initialize agent players
  const initializeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/agent-players/initialize', { method: 'POST' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent-players'] });
    },
  });

  // Validate domain configuration
  const validateMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const response = await fetch(`/api/agent-players/${playerId}/validate`, { method: 'POST' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent-players', selectedPlayer] });
    },
  });

  // Generate compliance report
  const reportMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const response = await fetch(`/api/agent-players/${playerId}/compliance-report`, { method: 'POST' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent-players', selectedPlayer] });
    },
  });

  const getDomainColor = (domain: string) => {
    const colors: Record<string, string> = {
      sales: 'bg-blue-100 text-blue-800',
      finance: 'bg-purple-100 text-purple-800',
      inventory: 'bg-cyan-100 text-cyan-800',
      procurement: 'bg-teal-100 text-teal-800',
      manufacturing: 'bg-orange-100 text-orange-800',
      controlling: 'bg-green-100 text-green-800'
    };
    return colors[domain] || 'bg-gray-100 text-gray-800';
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600';
      case 'non_compliant': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Player System</h1>
          <p className="text-muted-foreground mt-2">
            Domain-specific configuration oversight and cross-business integration
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
            variant="outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Initialize Players
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Players List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Agent Players
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {playersLoading ? (
                <div className="text-center py-4">Loading players...</div>
              ) : (
                players.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPlayer === player.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPlayer(player.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{player.name}</h3>
                      <Badge className={getDomainColor(player.businessDomain)}>
                        {player.businessDomain}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      {player.playerType.replace('_', ' ')}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Player Details */}
        <div className="lg:col-span-2">
          {selectedPlayer ? (
            detailsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">Loading player details...</div>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="validations">Configuration</TabsTrigger>
                  <TabsTrigger value="interactions">Cross-Domain</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{playerDetails?.player?.name}</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => validateMutation.mutate(selectedPlayer)}
                            disabled={validateMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Validate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reportMutation.mutate(selectedPlayer)}
                            disabled={reportMutation.isPending}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Report
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Business Domain</h4>
                          <Badge className={getDomainColor(playerDetails?.player?.businessDomain)}>
                            {playerDetails?.player?.businessDomain}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Player Type</h4>
                          <span className="capitalize">{playerDetails?.player?.playerType?.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Configuration Access</h4>
                        <div className="flex flex-wrap gap-2">
                          {playerDetails?.player?.configurationAccess?.map((area: string) => (
                            <Badge key={area} variant="outline">
                              {area.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Neighbor Domains</h4>
                        <div className="flex flex-wrap gap-2">
                          {playerDetails?.player?.neighborDomains?.map((domain: string) => (
                            <Badge key={domain} className={getDomainColor(domain)}>
                              {domain}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="validations">
                  <Card>
                    <CardHeader>
                      <CardTitle>Configuration Validations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {playerDetails?.validations?.map((validation: ValidationResult) => (
                          <div key={validation.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{validation.configurationArea}</h4>
                              <Badge className={getComplianceColor(validation.complianceStatus)}>
                                {validation.complianceStatus}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {validation.validationRule}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              Last checked: {new Date(validation.lastChecked).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="interactions">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ArrowLeftRight className="h-5 w-5" />
                        Cross-Domain Interactions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {playerDetails?.interactions?.length > 0 ? (
                          playerDetails.interactions.map((interaction: any) => (
                            <div key={interaction.id} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{interaction.businessContext}</span>
                                <Badge variant="outline">{interaction.status}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Target: {interaction.targetPlayerId}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(interaction.createdAt).toLocaleString()}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            No cross-domain interactions yet
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reports">
                  <Card>
                    <CardHeader>
                      <CardTitle>Compliance Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {playerDetails?.reports?.length > 0 ? (
                          playerDetails.reports.map((report: any) => (
                            <div key={report.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">{report.reportType}</h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">Compliance Score:</span>
                                  <Progress value={report.complianceScore} className="w-20" />
                                  <span className="text-sm font-medium">{report.complianceScore}%</span>
                                </div>
                              </div>
                              {report.recommendedActions?.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium mb-2">Recommended Actions:</h5>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {report.recommendedActions.map((action: string, index: number) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <AlertTriangle className="h-3 w-3 mt-0.5 text-yellow-500" />
                                        {action}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-2">
                                Generated: {new Date(report.generatedAt).toLocaleString()}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            No compliance reports available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an Agent Player to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}