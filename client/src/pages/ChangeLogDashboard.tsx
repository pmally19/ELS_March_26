import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  FileText, 
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  RefreshCw
} from "lucide-react";

interface ChangeRecord {
  changeNumber: string;
  objectClass: string;
  objectId: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  userName: string;
  applicationModule: string;
  businessProcess: string;
  changeTimestamp: string;
  changeReason: string;
  fieldCount: number;
  fieldChanges?: FieldChange[];
}

interface FieldChange {
  fieldName: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  changeIndicator: string;
  businessImpact: string;
}

interface ChangeStats {
  total_changes: number;
  unique_users: number;
  modules_affected: number;
  creates: number;
  updates: number;
  deletes: number;
  high_impact_changes: number;
  avg_fields_per_change: number;
}

export default function ChangeLogDashboard() {
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [stats, setStats] = useState<ChangeStats | null>(null);
  const [selectedChange, setSelectedChange] = useState<ChangeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [dateRange, setDateRange] = useState('7');

  const modules = ['MASTER_DATA', 'SALES', 'PURCHASE', 'INVENTORY', 'PRODUCTION', 'FINANCE', 'CONTROLLING'];
  const changeTypes = ['CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE'];

  const fetchRecentChanges = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedModule) params.append('module', selectedModule);
      params.append('limit', '100');

      const response = await fetch(`/api/change-log/recent?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setChanges(data.data);
      }
    } catch (error) {
      console.error('Error fetching changes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/change-log/stats?days=${dateRange}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchChangeDetails = async (objectClass: string, objectId: string) => {
    try {
      const response = await fetch(`/api/change-log/history/${objectClass}/${objectId}?limit=10`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        const detailedChange = data.data[0];
        setSelectedChange({
          ...changes.find(c => c.objectClass === objectClass && c.objectId === objectId)!,
          fieldChanges: detailedChange.fieldChanges
        });
      }
    } catch (error) {
      console.error('Error fetching change details:', error);
    }
  };

  useEffect(() => {
    fetchRecentChanges();
    fetchStats();
  }, [selectedModule, dateRange]);

  const filteredChanges = changes.filter(change => {
    const matchesSearch = !searchTerm || 
      change.objectClass.toLowerCase().includes(searchTerm.toLowerCase()) ||
      change.objectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      change.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      change.businessProcess.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || change.changeType === selectedType;
    
    return matchesSearch && matchesType;
  });

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'ACTIVATE': return 'bg-emerald-100 text-emerald-800';
      case 'DEACTIVATE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'CREATE': return <CheckCircle className="h-4 w-4" />;
      case 'UPDATE': return <FileText className="h-4 w-4" />;
      case 'DELETE': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Change Log & Audit Trail</h1>
          <p className="text-gray-600">Complete audit trail of all data changes across ERP modules</p>
        </div>
        <Button onClick={fetchRecentChanges} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Changes</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_changes}</div>
              <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unique_users}</div>
              <p className="text-xs text-muted-foreground">Making changes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modules Affected</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.modules_affected}</div>
              <p className="text-xs text-muted-foreground">ERP modules</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Impact Changes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.high_impact_changes}</div>
              <p className="text-xs text-muted-foreground">Requiring attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search changes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger>
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {modules.map(module => (
                  <SelectItem key={module} value={module}>{module}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {changeTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setSelectedModule('');
              setSelectedType('');
            }}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Changes List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Changes ({filteredChanges.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {filteredChanges.length > 0 ? (
                  <div className="space-y-4">
                    {filteredChanges.map((change, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => fetchChangeDetails(change.objectClass, change.objectId)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getChangeTypeIcon(change.changeType)}
                            <span className="font-medium">{change.changeNumber}</span>
                            <Badge className={getChangeTypeColor(change.changeType)}>
                              {change.changeType}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            {formatTimestamp(change.changeTimestamp)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Object:</span> {change.objectClass} - {change.objectId}
                          </div>
                          <div>
                            <span className="font-medium">User:</span> {change.userName}
                          </div>
                          <div>
                            <span className="font-medium">Module:</span> {change.applicationModule}
                          </div>
                          <div>
                            <span className="font-medium">Fields Changed:</span> {change.fieldCount}
                          </div>
                        </div>
                        
                        {change.businessProcess && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Process:</span> {change.businessProcess}
                          </div>
                        )}
                        
                        {change.changeReason && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Reason:</span> {change.changeReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No changes found matching your criteria</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Change Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Change Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedChange ? (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Change Information</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Number:</span> {selectedChange.changeNumber}</div>
                        <div><span className="font-medium">Type:</span> 
                          <Badge className={`ml-2 ${getChangeTypeColor(selectedChange.changeType)}`}>
                            {selectedChange.changeType}
                          </Badge>
                        </div>
                        <div><span className="font-medium">Object:</span> {selectedChange.objectClass}</div>
                        <div><span className="font-medium">ID:</span> {selectedChange.objectId}</div>
                        <div><span className="font-medium">User:</span> {selectedChange.userName}</div>
                        <div><span className="font-medium">Module:</span> {selectedChange.applicationModule}</div>
                        <div><span className="font-medium">Time:</span> {formatTimestamp(selectedChange.changeTimestamp)}</div>
                      </div>
                    </div>

                    {selectedChange.fieldChanges && selectedChange.fieldChanges.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Field Changes</h4>
                        <div className="space-y-3">
                          {selectedChange.fieldChanges.map((field, index) => (
                            <div key={index} className="border rounded p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{field.fieldLabel || field.fieldName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {field.changeIndicator}
                                </Badge>
                              </div>
                              
                              <div className="space-y-1 text-xs">
                                <div>
                                  <span className="text-red-600 font-medium">Old:</span> 
                                  <span className="ml-2 font-mono">{field.oldValue || '(empty)'}</span>
                                </div>
                                <div>
                                  <span className="text-green-600 font-medium">New:</span> 
                                  <span className="ml-2 font-mono">{field.newValue || '(empty)'}</span>
                                </div>
                              </div>
                              
                              {field.businessImpact && field.businessImpact !== 'LOW' && (
                                <div className="mt-2">
                                  <Badge 
                                    className={
                                      field.businessImpact === 'HIGH' ? 'bg-red-100 text-red-800' :
                                      field.businessImpact === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }
                                  >
                                    {field.businessImpact} Impact
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a change to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}