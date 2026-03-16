import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface SearchRefreshBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resourceName: string; // e.g., "purchase organization", "plant", etc.
  queryKey: string; // e.g., "/api/master-data/purchase-organization"
}

export function SearchRefreshBar({
  searchQuery,
  setSearchQuery,
  resourceName,
  queryKey,
}: SearchRefreshBarProps) {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    toast({
      title: "Refreshed",
      description: `${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} data has been refreshed.`,
    });
  };

  return (
    <div className="flex mb-4 gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          type="text"
          placeholder={`Search ${resourceName}s...`}
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <Button 
        variant="outline" 
        onClick={handleRefresh}
        className="space-x-2"
      >
        <RefreshCw className="h-4 w-4" />
        <span>Refresh</span>
      </Button>
    </div>
  );
}