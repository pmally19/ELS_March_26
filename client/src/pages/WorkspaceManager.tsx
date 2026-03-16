import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkspaceTile } from '@/components/workspace/WorkspaceTile';
import { TileListView } from '@/components/workspace/TileListView';
import WorkspaceAgent from '@/components/workspace/WorkspaceAgent';
import { SIMPLIFIED_TILE_CATALOG, getTilesByRole } from '@shared/simplified-tile-catalog';
import { Plus, Save, Settings, Users, Building, Package2, BookOpen, CreditCard, ShoppingCart, Package, Factory, BarChart2, DollarSign, FileText, ShoppingBag, Grid, List } from 'lucide-react';
import { useLocation } from 'wouter';

const iconMap = {
  Building,
  Factory,
  Package,
  Package2,
  Users,
  BookOpen,
  BarChart2,
  DollarSign,
  CreditCard,
  ShoppingCart,
  FileText,
  ShoppingBag
};

export default function WorkspaceManager() {
  const [, navigate] = useLocation();
  const [currentUser] = useState({
    id: 1,
    role: 'admin', // This would come from authentication
    name: 'Admin User'
  });
  
  const [workspaces, setWorkspaces] = useState([
    {
      id: 'all-modules',
      name: 'All Modules Workspace',
      description: 'Complete tile catalog from all business modules',
      tiles: SIMPLIFIED_TILE_CATALOG.map(tile => tile.number),
      isDefault: true
    },
    {
      id: 'master-data',
      name: 'Master Data Workspace', 
      description: 'Organizational and foundational data setup',
      tiles: SIMPLIFIED_TILE_CATALOG.filter(t => t.functionalArea === 'Master Data').map(tile => tile.number),
      isDefault: false
    },
    {
      id: 'sales-inventory',
      name: 'Sales & Inventory Workspace',
      description: 'Sales processes and inventory management',
      tiles: SIMPLIFIED_TILE_CATALOG.filter(t => ['Sales', 'Inventory'].includes(t.functionalArea)).map(tile => tile.number),
      isDefault: false
    },
    {
      id: 'finance-controlling',
      name: 'Finance & Controlling Workspace',
      description: 'Financial management and controlling',
      tiles: SIMPLIFIED_TILE_CATALOG.filter(t => ['Finance', 'Controlling'].includes(t.functionalArea)).map(tile => tile.number),
      isDefault: false
    },
    {
      id: 'procurement-production',
      name: 'Procurement & Production Workspace',
      description: 'Purchase processes and manufacturing',
      tiles: SIMPLIFIED_TILE_CATALOG.filter(t => ['Procurement', 'Production'].includes(t.functionalArea)).map(tile => tile.number),
      isDefault: false
    },
    {
      id: 'reporting',
      name: 'Reporting Workspace',
      description: 'Analytics and business intelligence',
      tiles: SIMPLIFIED_TILE_CATALOG.filter(t => t.functionalArea === 'Reporting').map(tile => tile.number),
      isDefault: false
    }
  ]);
  
  const [selectedWorkspace, setSelectedWorkspace] = useState('all-modules');
  const [availableTiles, setAvailableTiles] = useState(SIMPLIFIED_TILE_CATALOG);
  const [tileVisibility, setTileVisibility] = useState<Record<string, boolean>>({});
  const [tileFavorites, setTileFavorites] = useState<Record<string, boolean>>({});
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);

  useEffect(() => {
    // Initialize tile visibility and favorites
    const visibility: Record<string, boolean> = {};
    const favorites: Record<string, boolean> = {};
    
    SIMPLIFIED_TILE_CATALOG.forEach(tile => {
      visibility[tile.id] = true;
      favorites[tile.id] = false;
    });
    
    setTileVisibility(visibility);
    setTileFavorites(favorites);
  }, []);

  const getCurrentWorkspace = () => {
    return workspaces.find(w => w.id === selectedWorkspace) || workspaces[0];
  };

  const getWorkspaceTiles = () => {
    const workspace = getCurrentWorkspace();
    return SIMPLIFIED_TILE_CATALOG.filter(tile => workspace.tiles.includes(tile.number));
  };

  const getAvailableTilesForUser = () => {
    return getTilesByRole(currentUser.role);
  };

  const handleTileNavigation = (route: string) => {
    navigate(route);
  };

  const handleToggleVisibility = (tileId: string) => {
    setTileVisibility(prev => ({
      ...prev,
      [tileId]: !prev[tileId]
    }));
  };

  const handleToggleFavorite = (tileId: string) => {
    setTileFavorites(prev => ({
      ...prev,
      [tileId]: !prev[tileId]
    }));
  };

  const handleAddTileToWorkspace = (tileNumber: string) => {
    const workspace = getCurrentWorkspace();
    if (!workspace.tiles.includes(tileNumber)) {
      setWorkspaces(prev => prev.map(w => 
        w.id === selectedWorkspace 
          ? { ...w, tiles: [...w.tiles, tileNumber] }
          : w
      ));
    }
  };

  const handleRemoveTileFromWorkspace = (tileNumber: string) => {
    setWorkspaces(prev => prev.map(w => 
      w.id === selectedWorkspace 
        ? { ...w, tiles: w.tiles.filter(t => t !== tileNumber) }
        : w
    ));
  };

  const handleCreateWorkspace = () => {
    if (newWorkspaceName.trim()) {
      const newWorkspace = {
        id: `workspace_${Date.now()}`,
        name: newWorkspaceName,
        description: 'Custom workspace',
        tiles: [],
        isDefault: false
      };
      
      setWorkspaces(prev => [...prev, newWorkspace]);
      setSelectedWorkspace(newWorkspace.id);
      setNewWorkspaceName('');
    }
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Package className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workspace Manager</h1>
            <p className="text-gray-600 mt-1">Manage your personalized tile workspaces</p>
          </div>
          <Badge className="bg-blue-100 text-blue-800">
            Role: {currentUser.role}
          </Badge>
        </div>

        <Tabs value={selectedWorkspace} onValueChange={setSelectedWorkspace} className="space-y-6">
          {/* Workspace Tabs */}
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex h-auto p-1 bg-gray-100 rounded-lg">
                {workspaces.map(workspace => (
                  <TabsTrigger 
                    key={workspace.id} 
                    value={workspace.id} 
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    {workspace.isDefault && <Settings className="h-4 w-4 flex-shrink-0" />}
                    <span className="truncate max-w-32">{workspace.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                placeholder="New workspace name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="w-48"
              />
              <Button onClick={handleCreateWorkspace} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </div>

          {/* Workspace Content */}
          {workspaces.map(workspace => (
            <TabsContent key={workspace.id} value={workspace.id} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {workspace.name}
                    <Badge variant="outline">
                      {workspace.tiles.length} tiles
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {workspace.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Current Workspace Tiles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {getWorkspaceTiles().map(tile => (
                      <WorkspaceTile
                        key={tile.id}
                        id={tile.id}
                        number={tile.number}
                        title={tile.title}
                        description={tile.description}
                        category={tile.category}
                        icon={renderIcon(tile.icon)}
                        route={tile.route}
                        isVisible={tileVisibility[tile.id]}
                        isFavorite={tileFavorites[tile.id]}
                        onToggleVisibility={handleToggleVisibility}
                        onToggleFavorite={handleToggleFavorite}
                        onNavigate={handleTileNavigation}
                        userRole={currentUser.role}
                        requiredRoles={tile.requiredRoles}
                        moduleGroup={tile.moduleGroup}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Available Tiles to Add */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Available Tiles</CardTitle>
                      <CardDescription>
                        Add tiles to your workspace based on your role permissions
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid className="h-4 w-4 mr-2" />
                        Grid
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="h-4 w-4 mr-2" />
                        List
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {getAvailableTilesForUser()
                        .filter(tile => !workspace.tiles.includes(tile.number))
                        .map(tile => (
                          <div key={tile.id} className="relative">
                            <WorkspaceTile
                              id={tile.id}
                              number={tile.number}
                              title={tile.title}
                              description={tile.description}
                              category={tile.category}
                              icon={renderIcon(tile.icon)}
                              route={tile.route}
                              isVisible={true}
                              isFavorite={false}
                              userRole={currentUser.role}
                              requiredRoles={tile.requiredRoles}
                              moduleGroup={tile.moduleGroup}
                            />
                            <Button
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => handleAddTileToWorkspace(tile.number)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <TileListView
                      tiles={getAvailableTilesForUser().filter(tile => !workspace.tiles.includes(tile.number))}
                      selectedTiles={selectedTiles}
                      onTileSelect={setSelectedTiles}
                      userRole={currentUser.role}
                      onAddToWorkspace={(tileNumbers) => {
                        tileNumbers.forEach(number => handleAddTileToWorkspace(number));
                        setSelectedTiles([]);
                      }}
                      showWorkspaceActions={true}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Workspace Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Accessible Tiles</p>
                  <p className="text-2xl font-bold">{getAvailableTilesForUser().length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Settings className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Workspaces</p>
                  <p className="text-2xl font-bold">{workspaces.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Package className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Current Workspace Tiles</p>
                  <p className="text-2xl font-bold">{getCurrentWorkspace().tiles.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workspace Agent - AI Assistant */}
        <WorkspaceAgent />
      </div>
    </div>
  );
}