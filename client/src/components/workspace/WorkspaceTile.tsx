import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Star, StarOff, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceTileProps {
  id: string;
  number: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  route: string;
  isVisible?: boolean;
  isFavorite?: boolean;
  onToggleVisibility?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onNavigate?: (route: string) => void;
  userRole?: string;
  requiredRoles?: string[];
  moduleGroup?: string;
}

export function WorkspaceTile({
  id,
  number,
  title,
  description,
  category,
  icon,
  route,
  isVisible = true,
  isFavorite = false,
  onToggleVisibility,
  onToggleFavorite,
  onNavigate,
  userRole,
  requiredRoles = [],
  moduleGroup = 'general'
}: WorkspaceTileProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Grant access to all tiles - remove restrictions
  const hasAccess = true;

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'master data': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'transactions': return 'bg-green-100 text-green-800 border-green-200';
      case 'finance': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'sales': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'inventory': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getModuleGroupColor = (group: string) => {
    switch (group.toLowerCase()) {
      case 'organizational': return 'bg-indigo-50';
      case 'core': return 'bg-emerald-50';
      case 'finance': return 'bg-purple-50';
      case 'controlling': return 'bg-orange-50';
      case 'sales': return 'bg-blue-50';
      case 'procurement': return 'bg-teal-50';
      case 'inventory': return 'bg-cyan-50';
      default: return 'bg-gray-50';
    }
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 border-2 hover:shadow-lg",
        isVisible ? "opacity-100" : "opacity-60",
        isHovered ? "scale-105 shadow-xl" : "",
        getModuleGroupColor(moduleGroup),
        isFavorite ? "ring-2 ring-yellow-400" : ""
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onNavigate?.(route)}
    >
      <CardContent className="p-4">
        {/* Header with tile number and controls */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-xs font-mono font-bold bg-white">
            #{number}
          </Badge>
          <div className="flex items-center gap-1">
            {/* Favorite toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-yellow-100"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(id);
              }}
            >
              {isFavorite ? (
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
              ) : (
                <StarOff className="h-3 w-3 text-gray-400" />
              )}
            </Button>
            
            {/* Visibility toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-blue-100"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility?.(id);
              }}
            >
              {isVisible ? (
                <Eye className="h-3 w-3 text-blue-500" />
              ) : (
                <EyeOff className="h-3 w-3 text-gray-400" />
              )}
            </Button>
          </div>
        </div>

        {/* Category badge */}
        <Badge className={cn("text-xs mb-3", getCategoryColor(category))}>
          {category}
        </Badge>

        {/* Main content */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white shadow-sm">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1 truncate">
              {title}
            </h3>
            <p className="text-xs text-gray-600 line-clamp-2">
              {description}
            </p>
          </div>
        </div>

        {/* Module group indicator */}
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 capitalize">
              {moduleGroup} Module
            </span>
            <Settings className="h-3 w-3 text-gray-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}