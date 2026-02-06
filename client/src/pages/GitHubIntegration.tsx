import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Github, Plus, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface GitHubRepository {
  id: number;
  repository_name: string;
  repository_url: string;
  owner_username: string;
  default_branch: string;
  environment_mapping: any;
  auto_create_pr: boolean;
  is_active: boolean;
  created_at: string;
}

export default function GitHubIntegration() {
  const { toast } = useToast();
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [newRepo, setNewRepo] = useState({
    repositoryName: '',
    repositoryUrl: '',
    ownerUsername: '',
    accessToken: '',
    defaultBranch: 'main',
    environmentMapping: {
      DEV: 'development',
      QA: 'staging',
      PROD: 'production'
    },
    autoCreatePR: true,
    autoMergeApproved: false
  });

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/github/repositories');
      const data = await response.json();
      setRepositories(data.repositories || []);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch GitHub repositories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRepository = async () => {
    try {
      setLoading(true);

      if (!newRepo.repositoryName || !newRepo.ownerUsername || !newRepo.accessToken) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/github/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRepo)
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "Repository Connected",
          description: `Successfully connected ${newRepo.repositoryName}`,
          className: "bg-green-100 border-green-400 text-green-800"
        });

        setShowAddDialog(false);
        setNewRepo({
          repositoryName: '',
          repositoryUrl: '',
          ownerUsername: '',
          accessToken: '',
          defaultBranch: 'main',
          environmentMapping: {
            DEV: 'development',
            QA: 'staging', 
            PROD: 'production'
          },
          autoCreatePR: true,
          autoMergeApproved: false
        });

        fetchRepositories();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect repository');
      }

    } catch (error) {
      console.error('Error adding repository:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect GitHub repository",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Github className="h-8 w-8" />
            GitHub Integration
          </h1>
          <p className="text-gray-600 mt-2">
            Connect your GitHub repositories to automatically manage transport configurations
          </p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Connect Repository
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Connect GitHub Repository</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* GitHub Setup Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Setup Instructions</h3>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Go to GitHub Settings → Developer settings → Personal access tokens</li>
                  <li>2. Create token with permissions: repo, workflow, admin:repo_hook</li>
                  <li>3. Copy the token and paste below (starts with ghp_)</li>
                  <li>4. Ensure repository exists and you have admin access</li>
                </ol>
              </div>

              {/* Repository Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="repoName">Repository Name *</Label>
                  <Input
                    id="repoName"
                    placeholder="your-erp-config"
                    value={newRepo.repositoryName}
                    onChange={(e) => setNewRepo(prev => ({ ...prev, repositoryName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="ownerUsername">GitHub Username *</Label>
                  <Input
                    id="ownerUsername"
                    placeholder="your-username"
                    value={newRepo.ownerUsername}
                    onChange={(e) => setNewRepo(prev => ({ ...prev, ownerUsername: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="repoUrl">Repository URL</Label>
                <Input
                  id="repoUrl"
                  placeholder="https://github.com/username/repository"
                  value={newRepo.repositoryUrl}
                  onChange={(e) => setNewRepo(prev => ({ ...prev, repositoryUrl: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="accessToken">Personal Access Token *</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={newRepo.accessToken}
                  onChange={(e) => setNewRepo(prev => ({ ...prev, accessToken: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token is encrypted and stored securely
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultBranch">Default Branch</Label>
                  <Input
                    id="defaultBranch"
                    value={newRepo.defaultBranch}
                    onChange={(e) => setNewRepo(prev => ({ ...prev, defaultBranch: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Auto-create Pull Requests</Label>
                  <Select 
                    value={newRepo.autoCreatePR.toString()} 
                    onValueChange={(value) => setNewRepo(prev => ({ ...prev, autoCreatePR: value === 'true' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Environment Mapping */}
              <div>
                <Label>Environment Branch Mapping</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <Label className="text-xs">DEV Environment</Label>
                    <Input
                      placeholder="development"
                      value={newRepo.environmentMapping.DEV}
                      onChange={(e) => setNewRepo(prev => ({
                        ...prev,
                        environmentMapping: { ...prev.environmentMapping, DEV: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">QA Environment</Label>
                    <Input
                      placeholder="staging"
                      value={newRepo.environmentMapping.QA}
                      onChange={(e) => setNewRepo(prev => ({
                        ...prev,
                        environmentMapping: { ...prev.environmentMapping, QA: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">PROD Environment</Label>
                    <Input
                      placeholder="production"
                      value={newRepo.environmentMapping.PROD}
                      onChange={(e) => setNewRepo(prev => ({
                        ...prev,
                        environmentMapping: { ...prev.environmentMapping, PROD: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRepository} disabled={loading}>
                  {loading ? 'Connecting...' : 'Connect Repository'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Connected Repositories */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Repositories</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading repositories...</div>
          ) : repositories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Github className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No GitHub repositories connected yet</p>
              <p className="text-sm">Connect your first repository to enable transport automation</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Repository</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Default Branch</TableHead>
                  <TableHead>Environment Mapping</TableHead>
                  <TableHead>Auto PR</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repositories.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(repo.is_active)}
                        <Badge variant={repo.is_active ? "default" : "secondary"}>
                          {repo.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{repo.repository_name}</div>
                        {repo.repository_url && (
                          <a 
                            href={repo.repository_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View on GitHub
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{repo.owner_username}</TableCell>
                    <TableCell>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {repo.default_branch}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        {repo.environment_mapping && Object.entries(repo.environment_mapping).map(([env, branch]) => (
                          <div key={env} className="flex justify-between">
                            <span className="font-medium">{env}:</span>
                            <code className="bg-gray-100 px-1 rounded">{branch as string}</code>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={repo.auto_create_pr ? "default" : "outline"}>
                        {repo.auto_create_pr ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(repo.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-green-700 mb-2">Automatic Branching</h3>
              <p className="text-sm text-gray-600">
                Creates feature branches for each transport request with naming convention: transport/[number]-[environment]
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-blue-700 mb-2">Configuration Files</h3>
              <p className="text-sm text-gray-600">
                Generates structured JSON files for all transport objects with complete audit trails
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-purple-700 mb-2">Pull Requests</h3>
              <p className="text-sm text-gray-600">
                Automatically creates pull requests with transport details and deployment instructions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}