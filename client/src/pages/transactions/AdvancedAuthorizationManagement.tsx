import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, RefreshCw, Plus, Edit2, Eye, Shield, Users, Lock, Key, UserCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { Link } from 'wouter';

//  Authorization Management Type Definitions
interface AuthorizationRole {
  id: string;
  roleName: string;
  roleType: 'Composite' | 'Single' | 'Derived';
  description: string;
  transactionCodes: string[];
  authorizationObjects: string[];
  userCount: number;
  lastModified: string;
  status: 'Active' | 'Inactive' | 'In Review';
  companyCode: string;
  responsibleUser: string;
}

interface UserAuthorization {
  id: string;
  userId: string;
  userName: string;
  roles: string[];
  directAuthorizations: string[];
  validFrom: string;
  validTo: string;
  status: 'Active' | 'Locked' | 'Expired';
  lastLogin: string;
  failedAttempts: number;
  department: string;
}

interface AuthorizationObject {
  id: string;
  objectName: string;
  objectClass: string;
  description: string;
  fields: string[];
  criticalityLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  usageCount: number;
  companyCode: string;
}

export default function AdvancedAuthorizationManagement() {
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = useState<AuthorizationRole | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("1000");
  const [activeTab, setActiveTab] = useState<string>("roles");

  // Query  Authorization data from transaction tiles API
  const { data: authData, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/advanced-authorization-management', selectedCompany],
  });

  // Mutation for creating new roles
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: Partial<AuthorizationRole>) => {
      const response = await fetch('/api/transaction-tiles/advanced-authorization-management/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-tiles/advanced-authorization-management'] });
      setShowDialog(false);
    }
  });


  // Use API data directly, no hardcoded fallbacks
  const displayRoles = authData?.roles || [];
  const displayUsers = authData?.users || [];
  const displayObjects = authData?.objects || [];

  const handleRefresh = (): void => {
    refetch();
  };

  const handleAdd = (): void => {
    if (!permissions.canCreate) {
      alert('You do not have permission to create authorization roles');
      return;
    }
    setSelectedRole(null);
    setShowDialog(true);
  };

  const handleEdit = (role: AuthorizationRole): void => {
    if (!permissions.canModify) {
      alert('You do not have permission to modify authorization roles');
      return;
    }
    setSelectedRole(role);
    setShowDialog(true);
  };

  const handleSave = (): void => {
    const roleData = {
      roleName: 'NEW_ROLE',
      roleType: 'Single' as const,
      description: 'New Authorization Role',
      transactionCodes: ['SU01'],
      authorizationObjects: ['S_USER_GRP'],
      status: 'In Review' as const,
      companyCode: selectedCompany,
      responsibleUser: 'ADMIN.001'
    };

    createRoleMutation.mutate(roleData);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-gray-100 text-gray-800',
      'In Review': 'bg-yellow-100 text-yellow-800',
      'Locked': 'bg-red-100 text-red-800',
      'Expired': 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getCriticalityBadge = (level: string) => {
    const criticalityColors: Record<string, string> = {
      'Low': 'bg-green-100 text-green-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'High': 'bg-orange-100 text-orange-800',
      'Critical': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={criticalityColors[level] || 'bg-gray-100 text-gray-800'}>
        {level}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/transactions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transactions
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Advanced Authorization Management</h1>
            <p className="text-muted-foreground"> BASIS | Role-based access control with detailed permissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            PFCG/SU01
          </Badge>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Authorization Control Center
              </CardTitle>
              <CardDescription>
                Manage roles, users, and authorization objects
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">Company 1000</SelectItem>
                  <SelectItem value="2000">Company 2000</SelectItem>
                  <SelectItem value="3000">Company 3000</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!permissions.canCreate}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Role
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6">
            {[
              { id: 'roles', label: 'Roles', icon: Key },
              { id: 'users', label: 'User Authorizations', icon: Users },
              { id: 'objects', label: 'Authorization Objects', icon: Lock }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Roles Tab */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Roles</p>
                        <p className="text-2xl font-bold">3</p>
                      </div>
                      <Key className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Roles</p>
                        <p className="text-2xl font-bold">2</p>
                      </div>
                      <UserCheck className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                        <p className="text-2xl font-bold">26</p>
                      </div>
                      <Users className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Critical Objects</p>
                        <p className="text-2xl font-bold">1</p>
                      </div>
                      <Shield className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.roleName}</TableCell>
                        <TableCell>{role.roleType}</TableCell>
                        <TableCell className="max-w-xs truncate">{role.description}</TableCell>
                        <TableCell>{role.userCount}</TableCell>
                        <TableCell>{role.transactionCodes.length}</TableCell>
                        <TableCell>{getStatusBadge(role.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(role)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Failed Attempts</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.userId}</TableCell>
                      <TableCell>{user.userName}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.roles.slice(0, 2).map((role, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                          {user.roles.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.roles.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>{user.lastLogin}</TableCell>
                      <TableCell>{user.failedAttempts}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Authorization Objects Tab */}
          {activeTab === 'objects' && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Object Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Fields</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead>Usage Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayObjects.map((obj) => (
                    <TableRow key={obj.id}>
                      <TableCell className="font-medium">{obj.objectName}</TableCell>
                      <TableCell>{obj.objectClass}</TableCell>
                      <TableCell className="max-w-xs truncate">{obj.description}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {obj.fields.slice(0, 3).map((field, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                          {obj.fields.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{obj.fields.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getCriticalityBadge(obj.criticalityLevel)}</TableCell>
                      <TableCell>{obj.usageCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? 'Edit Authorization Role' : 'Create New Authorization Role'}
            </DialogTitle>
            <DialogDescription>
              Configure role permissions and authorization objects
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                placeholder="_NEW_ROLE"
                defaultValue="_NEW_ROLE"
              />
            </div>
            <div>
              <Label htmlFor="roleType">Role Type</Label>
              <Select defaultValue="Single">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Composite">Composite</SelectItem>
                  <SelectItem value="Derived">Derived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Role description"
                defaultValue="New Authorization Role"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createRoleMutation.isPending}
            >
              {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}