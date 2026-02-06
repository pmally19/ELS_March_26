import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, FileText, TrendingUp, Users, Database, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Import individual tile components
import ARPaymentRecording from "@/components/finance/ARPaymentRecording";
import CollectionManagementTile from "./tiles/CollectionManagementTile";
import CreditManagementTile from "./tiles/CreditManagementTile";
import AdvancedReportingTile from "./tiles/AdvancedReportingTile";
import IntegrationWorkflowsTile from "./tiles/IntegrationWorkflowsTile";
import DocumentManagementTile from "./tiles/DocumentManagementTile";
import CrossCheckValidationTile from "./tiles/CrossCheckValidationTile";

export default function FinanceTiles() {
  const [selectedTile, setSelectedTile] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Finance Management - Tile View | MallyERP";
  }, []);

  // Get AR statistics for tile badges
  const { data: arStats, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/ar/statistics'],
    queryFn: async () => {
      const response = await apiRequest('/api/ar/statistics');
      return await response.json();
    },
  });

  const tiles = [
    {
      id: "payment-processing",
      title: "Payment Processing & Recording",
      icon: <CreditCard className="h-8 w-8 text-blue-600" />,
      description: "Process payments, record transactions, and manage payment methods",
      stats: arStats?.payments || { total: 0, pending: 0, completed: 0 },
      color: "blue",
      component: ARPaymentRecording
    },
    {
      id: "collection-management", 
      title: "Collection Management",
      icon: <Users className="h-8 w-8 text-green-600" />,
      description: "Manage collections, dunning processes, and customer communications",
      stats: arStats?.collections || { active: 0, overdue: 0, resolved: 0 },
      color: "green",
      component: CollectionManagementTile
    },
    {
      id: "credit-management",
      title: "Credit Management", 
      icon: <TrendingUp className="h-8 w-8 text-purple-600" />,
      description: "Monitor credit limits, scoring, and customer creditworthiness",
      stats: arStats?.credit || { customers: 0, alerts: 0, limits: 0 },
      color: "purple",
      component: CreditManagementTile
    },
    {
      id: "advanced-reporting",
      title: "Advanced Reporting",
      icon: <FileText className="h-8 w-8 text-orange-600" />,
      description: "Generate comprehensive AR reports and analytics",
      stats: arStats?.reports || { generated: 0, scheduled: 0, alerts: 0 },
      color: "orange", 
      component: AdvancedReportingTile
    },
    {
      id: "integration-workflows",
      title: "Integration Workflows",
      icon: <Database className="h-8 w-8 text-indigo-600" />,
      description: "Automate AR workflows and system integrations",
      stats: arStats?.workflows || { active: 0, completed: 0, failed: 0 },
      color: "indigo",
      component: IntegrationWorkflowsTile
    },
    {
      id: "document-management",
      title: "Document Management", 
      icon: <FileText className="h-8 w-8 text-red-600" />,
      description: "Manage AR documents, templates, and communications",
      stats: arStats?.documents || { total: 0, pending: 0, sent: 0 },
      color: "red",
      component: DocumentManagementTile
    },
    {
      id: "crosscheck-validation",
      title: "CrossCheck Lineage Validation",
      icon: <CheckCircle className="h-8 w-8 text-emerald-600" />,
      description: "Complete data lineage validation and integrity checks",
      stats: arStats?.validation || { passed: 0, failed: 0, warnings: 0 },
      color: "emerald",
      component: CrossCheckValidationTile
    }
  ];

  if (selectedTile) {
    const tile = tiles.find(t => t.id === selectedTile);
    if (tile) {
      const TileComponent = tile.component;
      return (
        <div className="min-h-screen bg-gray-50">
          {/* Back Button Header */}
          <div className="bg-white border-b shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <Button
                variant="ghost"
                onClick={() => setSelectedTile(null)}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Finance Tiles
              </Button>
              <div className="flex items-center space-x-3">
                {tile.icon}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{tile.title}</h1>
                  <p className="text-gray-600">{tile.description}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Scrollable Tile Content */}
          <div className="max-w-7xl mx-auto px-4 py-6 h-[calc(100vh-120px)] overflow-y-auto">
            <TileComponent onBack={() => setSelectedTile(null)} />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Finance Management</h1>
              <p className="text-gray-600 mt-2">Complete Accounts Receivable system with integrated database operations</p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/finance'}
              className="text-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Finance
            </Button>
          </div>
        </div>
      </div>

      {/* Tiles Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiles.map((tile) => (
            <Card 
              key={tile.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-l-4 border-l-${tile.color}-500`}
              onClick={() => setSelectedTile(tile.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {tile.icon}
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {tile.title}
                      </CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">{tile.description}</p>
                
                {/* Statistics Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(tile.stats).map(([key, value]) => (
                    <Badge 
                      key={key} 
                      variant="outline" 
                      className={`text-${tile.color}-700 border-${tile.color}-200 bg-${tile.color}-50`}
                    >
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
                
                <Button 
                  className={`w-full bg-${tile.color}-600 hover:bg-${tile.color}-700 text-white`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTile(tile.id);
                  }}
                >
                  Open {tile.title} →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}