import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Bot,
  Send,
  User,
  Shield,
  Users,
  Key,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Eye,
  Edit,
  Plus,
  Copy,
  Trash2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    action?: string;
    roleId?: number;
    userId?: number;
    tileId?: string;
  };
}

interface RoleDetails {
  id: number;
  role_name: string;
  description: string;
  created_at: string;
  permissions_count: number;
  users_count: number;
  recent_changes: RecentChange[];
}

interface UserDetails {
  id: number;
  username: string;
  email: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
  last_login: string;
  permissions: Permission[];
}

interface RecentChange {
  tile_id: string;
  action: string;
  is_granted: boolean;
  updated_at: string;
  tile_name?: string;
}

interface Permission {
  tile_id: string;
  tile_name: string;
  module_group: string;
  is_granted: boolean;
}

interface Role {
  id: number;
  role_name: string;
  description: string;
  permissions?: Permission[];
  users?: UserDetails[];
}

interface User {
  id: number;
  username: string;
  email: string;
  role_name: string;
  is_active: boolean;
}

interface PermissionsOverview {
  total_permissions: number;
  granted_permissions: number;
  roles_with_permissions: number;
  tiles_with_permissions: number;
}

interface ChatResponse {
  message: string;
  context: {
    suggestedView?: string;
    dataChanged?: boolean;
    changeDescription?: string;
    systemContext?: any;
  };
}

export default function RoleAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your RoleAgent assistant. I can help you manage user roles, permissions, and authorization settings. What would you like to know about?',
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedContext, setSelectedContext] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch roles data
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['/api/admin/roles'],
    staleTime: 1000 * 60 * 2
  });

  // Fetch users data
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    staleTime: 1000 * 60 * 2
  });

  // Fetch permissions overview
  const { data: permissionsOverview } = useQuery<PermissionsOverview>({
    queryKey: ['/api/admin/permissions/overview'],
    staleTime: 1000 * 60 * 2
  });

  // Fetch role details when specific role is selected
  const { data: roleDetails } = useQuery<RoleDetails>({
    queryKey: ['/api/admin/role-details', selectedContext],
    queryFn: async () => {
      if (!selectedContext.startsWith('role-')) {
        throw new Error('Invalid role context');
      }
      const roleId = selectedContext.split('-')[1];
      const response = await apiRequest(`/api/admin/role-details/${roleId}`);
      return response;
    },
    enabled: selectedContext !== 'overview' && selectedContext.startsWith('role-'),
    staleTime: 1000 * 60 * 1
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/admin/role-agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: selectedContext,
          chatHistory: messages.slice(-5) // Last 5 messages for context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from RoleAgent');
      }

      return response.json();
    },
    onSuccess: (response: any) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message || "I can help you manage user roles and permissions. What would you like to know?",
        timestamp: new Date(),
        context: {
          action: response.context?.changeDescription ? 'data_change' : 'info',
          roleId: response.context?.suggestedView?.includes('role-') ?
            parseInt(response.context.suggestedView.split('-')[1]) : undefined,
          userId: response.context?.suggestedView?.includes('user-') ?
            parseInt(response.context.suggestedView.split('-')[1]) : undefined
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update context if agent suggests viewing specific role/user
      if (response.context?.suggestedView) {
        setSelectedContext(response.context.suggestedView);
      }

      // Handle navigation suggestions from RoleAgent
      if (response.context?.navigationSuggestion) {
        const nav = response.context.navigationSuggestion;

        if (nav.route) {
          // Show navigation suggestion to user
          toast({
            title: "Navigation Suggestion",
            description: `RoleAgent suggests: ${nav.description}`,
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = nav.route}
              >
                Go There
              </Button>
            )
          });
        } else if (nav.tileId) {
          // Show tile-specific suggestion
          toast({
            title: "Tile Access",
            description: `RoleAgent found tile ${nav.tileId}: ${nav.description}`,
          });
        }
      }

      // Refresh data if changes were made
      if (response.context?.dataChanged) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
        toast({
          title: "Changes Applied",
          description: response.context.changeDescription || "Role/user data updated successfully"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Chat Error",
        description: "Failed to get response from RoleAgent",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    chatMutation.mutate(currentMessage);
    setCurrentMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'view': return <Eye className="h-3 w-3" />;
      case 'create': return <Plus className="h-3 w-3" />;
      case 'edit': return <Edit className="h-3 w-3" />;
      case 'copy': return <Copy className="h-3 w-3" />;
      case 'deactivate': return <Trash2 className="h-3 w-3" />;
      default: return <Key className="h-3 w-3" />;
    }
  };

  const renderOverviewPanel = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">
              Active role definitions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u: any) => u.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {permissionsOverview?.total_permissions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all tiles
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-2">
          <div className="space-y-2">
            {roles.map((role: Role) => (
              <Card
                key={role.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setSelectedContext(`role-${role.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{role.role_name}</h4>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {role.permissions?.length || 0} permissions
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {role.users?.length || 0} users
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-2">
          <div className="space-y-2">
            {users.map((user: User) => (
              <Card
                key={user.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setSelectedContext(`user-${user.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{user.username}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {user.role_name}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderRoleDetailsPanel = () => {
    if (!roleDetails) return <div className="p-4">Loading role details...</div>;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{roleDetails.role_name}</h3>
            <p className="text-sm text-muted-foreground">{roleDetails.description}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedContext('overview')}
          >
            Back to Overview
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{roleDetails.permissions_count}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Assigned Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{roleDetails.users_count}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Permission Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {roleDetails.recent_changes?.length > 0 ? (
                <div className="space-y-2">
                  {roleDetails.recent_changes.map((change: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center space-x-2">
                        {getPermissionIcon(change.action)}
                        <span className="text-sm">{change.tile_id}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={change.is_granted ? "default" : "secondary"}>
                          {change.is_granted ? "Granted" : "Denied"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(change.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent changes</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-6">
      {/* Left Panel - Chat Interface */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex flex-row items-center space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>RoleAgent Assistant</CardTitle>
          </div>
          <div className="ml-auto">
            <Badge variant="outline" className="text-xs">
              <Database className="h-3 w-3 mr-1" />
              RBAC System
            </Badge>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`rounded-lg p-3 ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                      }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm">RoleAgent is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                placeholder="Ask about roles, users, permissions, or authorization..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !currentMessage.trim()}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right Panel - Context Details */}
      <Card className="w-[400px] flex flex-col">
        <CardHeader className="flex flex-row items-center space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Authorization Details</CardTitle>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="flex-1 p-4">
          <ScrollArea className="h-full">
            {selectedContext === 'overview' && renderOverviewPanel()}
            {selectedContext.startsWith('role-') && renderRoleDetailsPanel()}
            {selectedContext.startsWith('user-') && (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  User details will be displayed here when you select a user from the chat or overview.
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}