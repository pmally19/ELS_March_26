import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  auto_merge_approved: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function GitHubSetup() {
  const { toast } = useToast();
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Form state for new repository
  const [formData, setFormData] = useState({
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

  const testGitHubConnection = async () => {
    if (!formData.repositoryName || !formData.ownerUsername || !formData.accessToken) {
      toast({
        title: "Missing Information",
        description: "Please fill in repository name, owner username, and access token",
        variant: "destructive"
      });
      return;
    }

    try {
      setTestingConnection(true);
      
      // Test GitHub API access
      const testResponse = await fetch(`https://api.github.com/repos/${formData.ownerUsername}/${formData.repositoryName}`, {
        headers: {
          'Authorization': `token ${formData.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MallyERP-Transport-System'
        }
      });

      if (testResponse.ok) {
        const repoData = await testResponse.json();
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${repoData.full_name}`,
          className: "bg-green-100 border-green-400 text-green-800"
        });
        
        // Auto-fill repository URL if not provided
        if (!formData.repositoryUrl) {
          setFormData(prev => ({ ...prev, repositoryUrl: repoData.html_url }));
        }
      } else {
        throw new Error(`GitHub API returned ${testResponse.status}`);
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to GitHub repository. Please check your repository details and access token.",
        variant: "destructive"
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleRegisterRepository = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/github/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Repository Registered",
          description: `Successfully registered ${data.repository.repositoryName}`,
          className: "bg-green-100 border-green-400 text-green-800"
        });
        
        // Reset form
        setFormData({
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
        
        // Refresh repositories list
        fetchRepositories();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register repository');
      }
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Github className="h-8 w-8" />
          GitHub Integration Setup
        </h1>
        <p className="text-gray-600 mt-2">
          Connect your GitHub repositories to automatically manage transport request workflows
        </p>
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList>
          <TabsTrigger value="setup">Repository Setup</TabsTrigger>
          <TabsTrigger value="repositories">Connected Repositories</TabsTrigger>
          <TabsTrigger value="instructions">Setup Instructions</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connect New GitHub Repository</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="repositoryName">Repository Name *</Label>
                  <Input
                    id="repositoryName"
                    placeholder="e.g., my-erp-config"
                    value={formData.repositoryName}
                    onChange={(e) => setFormData(prev => ({ ...prev, repositoryName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="ownerUsername">Owner Username *</Label>
                  <Input
                    id="ownerUsername"
                    placeholder="e.g., your-github-username"
                    value={formData.ownerUsername}
                    onChange={(e) => setFormData(prev => ({ ...prev, ownerUsername: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="repositoryUrl">Repository URL</Label>
                <Input
                  id="repositoryUrl"
                  placeholder="https://github.com/username/repository"
                  value={formData.repositoryUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, repositoryUrl: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="accessToken">Personal Access Token *</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={formData.accessToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, accessToken: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Generate at: GitHub Settings → Developer settings → Personal access tokens
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={testGitHubConnection}
                  disabled={testingConnection}
                  className="flex items-center gap-2"
                >
                  {testingConnection ? (
                    <AlertCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Test Connection
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultBranch">Default Branch</Label>
                  <Select value={formData.defaultBranch} onValueChange={(value) => setFormData(prev => ({ ...prev, defaultBranch: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">main</SelectItem>
                      <SelectItem value="master">master</SelectItem>
                      <SelectItem value="develop">develop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Environment Mapping</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label htmlFor="dev-branch" className="text-sm">DEV → Branch</Label>
                    <Input
                      id="dev-branch"
                      placeholder="development"
                      value={formData.environmentMapping.DEV}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        environmentMapping: { ...prev.environmentMapping, DEV: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="qa-branch" className="text-sm">QA → Branch</Label>
                    <Input
                      id="qa-branch"
                      placeholder="staging"
                      value={formData.environmentMapping.QA}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        environmentMapping: { ...prev.environmentMapping, QA: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="prod-branch" className="text-sm">PROD → Branch</Label>
                    <Input
                      id="prod-branch"
                      placeholder="production"
                      value={formData.environmentMapping.PROD}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        environmentMapping: { ...prev.environmentMapping, PROD: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleRegisterRepository} disabled={loading}>
                  {loading ? 'Registering...' : 'Register Repository'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repositories">
          <Card>
            <CardHeader>
              <CardTitle>Connected Repositories ({repositories.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {repositories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No repositories connected yet. Use the Repository Setup tab to connect your first repository.
                </div>
              ) : (
                <div className="space-y-4">
                  {repositories.map((repo) => (
                    <div key={repo.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{repo.repository_name}</h3>
                          <p className="text-sm text-gray-600">{repo.repository_url}</p>
                          <p className="text-xs text-gray-500">Owner: {repo.owner_username}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={repo.is_active ? "default" : "secondary"}>
                            {repo.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructions">
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Github className="h-4 w-4" />
                <AlertDescription>
                  Follow these steps to set up GitHub integration for transport requests
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Step 1: Create GitHub Personal Access Token</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
                    <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                    <li>Click "Generate new token (classic)"</li>
                    <li>Select these permissions: repo, workflow, admin:repo_hook</li>
                    <li>Copy the generated token</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Step 2: Prepare Your Repository</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
                    <li>Create or use existing GitHub repository</li>
                    <li>Ensure you have admin access to the repository</li>
                    <li>Create environment branches (development, staging, production)</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Step 3: Configure Integration</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
                    <li>Fill in repository details in the Repository Setup tab</li>
                    <li>Test the connection to verify access</li>
                    <li>Configure environment mappings</li>
                    <li>Register the repository</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Step 4: Use with Transport Requests</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
                    <li>Create transport requests as usual</li>
                    <li>Enable GitHub integration during creation</li>
                    <li>System automatically creates branches and pull requests</li>
                    <li>Track deployment status through GitHub webhooks</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}