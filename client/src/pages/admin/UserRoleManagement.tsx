import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Shield, Settings, UserPlus, Key, Copy, Trash2, Edit, Eye, Plus, Bot, Database } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import RoleAgent from "./RoleAgent";
import APIKeyManager from "../APIKeyManager";

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role_name: string;
  role_level: number;
  is_active: boolean;
  last_login: string;
  created_at: string;
}

interface Role {
  id: number;
  role_name: string;
  role_description: string;
  role_level: number;
  is_active: boolean;
}

interface Tile {
  tile_id: string;
  tile_name: string;
  tile_category: string;
  module_group: string;
  route_path: string;
  icon_name: string;
  is_active: boolean;
}

interface Permission {
  tile_id: string;
  tile_name: string;
  module_group: string;
  permissions: {
    View: boolean;
    Create: boolean;
    Edit: boolean;
    Copy: boolean;
    Deactivate: boolean;
    Export: boolean;
    Import: boolean;
    Approve: boolean;
  };
}

const PERMISSION_ACTIONS = [
  { key: 'View', label: 'View', description: 'Read access to data', color: 'bg-blue-100 text-blue-800' },
  { key: 'Create', label: 'Create', description: 'Add new records', color: 'bg-green-100 text-green-800' },
  { key: 'Edit', label: 'Edit', description: 'Modify existing records', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'Copy', label: 'Copy', description: 'Duplicate records', color: 'bg-purple-100 text-purple-800' },
  { key: 'Deactivate', label: 'Deactivate', description: 'Soft delete records', color: 'bg-orange-100 text-orange-800' },
  { key: 'Export', label: 'Export', description: 'Export data', color: 'bg-indigo-100 text-indigo-800' },
  { key: 'Import', label: 'Import', description: 'Import data', color: 'bg-pink-100 text-pink-800' },
  { key: 'Approve', label: 'Approve', description: 'Workflow approvals', color: 'bg-emerald-100 text-emerald-800' }
];

export default function UserRoleManagement() {
  const [activeTab, setActiveTab] = useState("users");
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Edit/Delete State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role_id: "",
    is_active: true
  });

  const queryClient = useQueryClient();

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  // Fetch roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['/api/admin/roles'],
  });

  // Fetch tiles
  const { data: tiles, isLoading: tilesLoading } = useQuery({
    queryKey: ['/api/admin/tiles'],
  });

  // Fetch permissions for selected role
  const { data: rolePermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['/api/admin/role-permissions', selectedRole],
    queryFn: () => fetch(`/api/admin/role-permissions/${selectedRole}`).then(res => res.json()),
    enabled: !!selectedRole,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: any) => apiRequest('/api/admin/users', { method: 'POST', body: userData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (userData: any) => apiRequest(`/api/admin/users/${userData.id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsEditUserOpen(false);
      setEditingUser(null);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    },
  });

  // Batch save permissions mutation
  const batchSavePermissionsMutation = useMutation({
    mutationFn: (batchData: { roleId: number; permissions: any[] }) => {
      console.log('Batch saving permissions:', batchData);
      return fetch('/api/admin/batch-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
    },
    onSuccess: () => {
      setPendingChanges(new Map());
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/role-permissions', selectedRole] });
    },
    onError: (error) => {
      console.error('Batch permission save error:', error);
    }
  });

  // Toggle user active status
  const toggleUserMutation = useMutation({
    mutationFn: (userData: { userId: number; isActive: boolean }) =>
      apiRequest(`/api/admin/users/${userData.userId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ is_active: userData.isActive })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      role_id: user.role_name ? (roles as Role[])?.find((r: Role) => r.role_name === user.role_name)?.id.toString() || "" : "",
      is_active: user.is_active
    });
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      id: editingUser.id,
      ...editFormData
    });
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const handlePermissionChange = (tileId: string, action: string, granted: boolean) => {
    if (!selectedRole) return;

    const changeKey = `${selectedRole}-${tileId}-${action}`;
    const newChanges = new Map(pendingChanges);

    newChanges.set(changeKey, {
      roleId: selectedRole,
      tileId: tileId,
      actionName: action,
      isGranted: granted,
      timestamp: new Date().toISOString()
    });

    setPendingChanges(newChanges);
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = () => {
    if (!selectedRole || pendingChanges.size === 0) return;

    const permissionsArray = Array.from(pendingChanges.values());
    batchSavePermissionsMutation.mutate({
      roleId: selectedRole,
      permissions: permissionsArray
    });
  };

  const handleDiscardChanges = () => {
    setPendingChanges(new Map());
    setHasUnsavedChanges(false);
  };

  const uniqueModules = tiles ? Array.from(new Set((tiles as Tile[]).map((tile: Tile) => tile.module_group))) : [];
  const filteredTiles = tiles ? (tiles as Tile[]).filter((tile: Tile) =>
    selectedModule === "all" || tile.module_group === selectedModule
  ) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User & Role Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user access, roles, and permissions across all system tiles
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Form implementation needed - reusing update logic would be best but for speed: */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" placeholder="john.doe" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john.doe@company.com" />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {(roles as Role[])?.map((role: Role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.role_name} (Level {role.role_level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">Create User</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={editFormData.first_name}
                      onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={editFormData.last_name}
                      onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select
                    value={editFormData.role_id}
                    onValueChange={(val) => setEditFormData({ ...editFormData, role_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {(roles as Role[])?.map((role: Role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.role_name} (Level {role.role_level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-active"
                    checked={editFormData.is_active}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_active: checked as boolean })}
                  />
                  <Label htmlFor="edit-active">Active</Label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the user <span className="font-semibold">{userToDelete?.first_name} {userToDelete?.last_name}</span>.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-[75%] grid-cols-5 mx-auto">
          <TabsTrigger value="users" className="flex items-center gap-1 text-xs px-2 py-1">
            <Users className="h-3 w-3" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-1 text-xs px-2 py-1">
            <Shield className="h-3 w-3" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="tiles" className="flex items-center gap-1 text-xs px-2 py-1">
            <Settings className="h-3 w-3" />
            System Tiles
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-1 text-xs px-2 py-1">
            <Key className="h-3 w-3" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="roleagent" className="flex items-center gap-1 text-xs px-2 py-1">
            <Bot className="h-3 w-3" />
            RoleAgent
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Users</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading users...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(users as User[])?.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.first_name} {user.last_name}</div>
                            <div className="text-sm text-muted-foreground">@{user.username}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Shield className="h-3 w-3" />
                            {user.role_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "secondary"}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleUserMutation.mutate({
                                userId: user.id,
                                isActive: !user.is_active
                              })}
                            >
                              {user.is_active ? <Eye className="h-4 w-4 text-orange-500" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roles List */}
            <Card>
              <CardHeader>
                <CardTitle>Roles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rolesLoading ? (
                  <div className="text-muted-foreground">Loading roles...</div>
                ) : (
                  (roles as Role[])?.map((role: Role) => (
                    <div
                      key={role.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedRole === role.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                      onClick={() => setSelectedRole(role.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{role.role_name}</div>
                          <div className="text-sm text-muted-foreground">Level {role.role_level}</div>
                        </div>
                        <Badge variant={role.is_active ? "default" : "secondary"}>
                          {role.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{role.role_description}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Permissions Matrix */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {selectedRole ? `Permissions for ${(roles as Role[])?.find((r: Role) => r.id === selectedRole)?.role_name}` : 'Select a Role'}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Select value={selectedModule} onValueChange={setSelectedModule}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modules</SelectItem>
                        {uniqueModules.map((module: string) => (
                          <SelectItem key={module} value={module}>{module}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasUnsavedChanges && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDiscardChanges}
                          disabled={batchSavePermissionsMutation.isPending}
                        >
                          Discard Changes
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveChanges}
                          disabled={batchSavePermissionsMutation.isPending}
                        >
                          {batchSavePermissionsMutation.isPending ? 'Saving...' : `Save Changes (${pendingChanges.size})`}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {hasUnsavedChanges && (
                  <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                    You have {pendingChanges.size} unsaved permission change{pendingChanges.size !== 1 ? 's' : ''}. Click "Save Changes" to apply them.
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!selectedRole ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <div className="text-center">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a role to manage permissions</p>
                    </div>
                  </div>
                ) : permissionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading permissions...</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Permission Actions Legend */}
                    <div className="flex flex-wrap gap-2">
                      {PERMISSION_ACTIONS.map((action) => (
                        <Badge key={action.key} variant="outline" className={action.color}>
                          {action.label}
                        </Badge>
                      ))}
                    </div>

                    {/* Permissions Table */}
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tile</TableHead>
                            <TableHead>Module</TableHead>
                            {PERMISSION_ACTIONS.map((action) => (
                              <TableHead key={action.key} className="text-center w-16">
                                {action.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTiles.map((tile: Tile) => {
                            const tilePermissions = (rolePermissions as Permission[])?.find((p: Permission) => p.tile_id === tile.tile_id);
                            return (
                              <TableRow key={tile.tile_id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{tile.tile_name}</div>
                                    <div className="text-sm text-muted-foreground">{tile.tile_id}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{tile.module_group}</Badge>
                                </TableCell>
                                {PERMISSION_ACTIONS.map((action) => (
                                  <TableCell key={action.key} className="text-center">
                                    <Checkbox
                                      checked={tilePermissions?.permissions[action.key as keyof typeof tilePermissions.permissions] || false}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(tile.tile_id, action.key, checked as boolean)
                                      }
                                    />
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Tiles Tab */}
        <TabsContent value="tiles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>System Tiles Registry</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {(tiles as Tile[])?.length || 0} tiles registered
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tilesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading tiles...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {uniqueModules.map((module: string) => (
                    <div key={module} className="space-y-2">
                      <h3 className="font-semibold text-lg border-b pb-2">{module}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(tiles as Tile[])?.filter((tile: Tile) => tile.module_group === module).map((tile: Tile) => (
                          <Card key={tile.tile_id} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">{tile.tile_id}</Badge>
                              <Badge variant={tile.is_active ? "default" : "secondary"}>
                                {tile.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <h4 className="font-medium">{tile.tile_name}</h4>
                            <p className="text-sm text-muted-foreground">{tile.tile_category}</p>
                            <p className="text-xs text-muted-foreground mt-1">{tile.route_path}</p>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <h2 className="text-2xl font-semibold">AI Provider API Keys</h2>
            </div>
            <p className="text-muted-foreground">
              Configure AI provider keys for Designer Agent fallback system. Keys are securely stored in the database.
            </p>
            <APIKeyManager />
          </div>
        </TabsContent>

        {/* RoleAgent Tab */}
        <TabsContent value="roleagent" className="space-y-6">
          <RoleAgent />
        </TabsContent>
      </Tabs>
    </div>
  );
}