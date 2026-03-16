import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cloud, CheckCircle, CloudOff, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function AWSSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Check AWS status
  const { data: awsStatus, isLoading } = useQuery({
    queryKey: ['/api/aws/aws-status'],
    refetchInterval: 30000 // Check every 30 seconds
  });

  // Sync to AWS mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/aws/sync-to-aws', { method: 'POST' });
      if (!response.ok) throw new Error('Sync failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aws/aws-status'] });
      setSyncing(false);
    },
    onError: () => {
      setSyncing(false);
    }
  });

  const handleSync = () => {
    setSyncing(true);
    syncMutation.mutate();
  };

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (awsStatus?.connection?.connected) return <CheckCircle className="h-4 w-4" />;
    return <CloudOff className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (awsStatus?.connection?.connected) return "bg-green-100 text-green-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="flex items-center gap-3">
      <Badge className={getStatusColor()}>
        {getStatusIcon()}
        <span className="ml-1">
          {awsStatus?.connection?.connected ? 'AWS Connected' : 'AWS Disconnected'}
        </span>
      </Badge>
      
      <Button 
        onClick={handleSync}
        disabled={syncing || syncMutation.isPending}
        size="sm"
        variant="outline"
      >
        <Cloud className="h-4 w-4 mr-1" />
        {syncing || syncMutation.isPending ? 'Syncing...' : 'Sync to AWS'}
      </Button>
    </div>
  );
}