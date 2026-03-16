import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Package, DollarSign, AlertTriangle, Edit, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";

// Function to safely extract text from HTML strings
function renderMessageContent(htmlString: string) {
  // Check if the string contains HTML
  if (htmlString && htmlString.includes('<span')) {
    // Extract text between span tags with class 'font-medium'
    const fontMediumMatch = htmlString.match(/<span class=['"]font-medium['"]>(.*?)<\/span>/);
    const restOfMessage = htmlString.replace(/<span class=['"]font-medium['"]>.*?<\/span>/, '').trim();
    
    return (
      <>
        {fontMediumMatch && <span className="font-medium">{fontMediumMatch[1]}</span>}{' '}
        {restOfMessage}
      </>
    );
  }
  
  // Return the original string if not HTML
  return htmlString;
};

export default function ActivityFeed() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: activities, isLoading } = useQuery({
    queryKey: ['/api/activities/recent'],
  });

  // Fetch all activities for the dialog (with higher limit)
  const { data: allActivities, isLoading: isLoadingAll } = useQuery({
    queryKey: ['/api/activities/recent', 'all'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/activities/recent');
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching all activities:', error);
        return [];
      }
    },
    enabled: isDialogOpen, // Only fetch when dialog is open
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'payment':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'inventory':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'customer':
        return <Edit className="h-4 w-4 text-purple-600" />;
      case 'product':
        return <BarChart className="h-4 w-4 text-indigo-600" />;
      default:
        return <Package className="h-4 w-4 text-blue-600" />;
    }
  };

  const getActivityBackground = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-blue-100';
      case 'payment':
        return 'bg-green-100';
      case 'inventory':
        return 'bg-yellow-100';
      case 'customer':
        return 'bg-purple-100';
      case 'product':
        return 'bg-indigo-100';
      default:
        return 'bg-blue-100';
    }
  };

  return (
    <Card className="border border-gray-100 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-gray-200">
        <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-4 text-center">
              <p>Loading recent activities...</p>
            </div>
          ) : Array.isArray(activities) && activities.length > 0 ? (
            activities.map((activity: any) => (
              <div key={activity.id} className="flex items-start">
                <div className={`h-8 w-8 ${getActivityBackground(activity.type)} rounded-full flex items-center justify-center flex-shrink-0`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-gray-900">
                    {/* Parse HTML content properly */}
                    {renderMessageContent(activity.message)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.timeAgo}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-gray-500">No recent activities found.</div>
          )}
        </div>
        
        <div className="mt-4 text-center">
          <Button 
            variant="link" 
            className="text-sm font-medium text-primary-600 hover:text-primary-800"
            onClick={() => setIsDialogOpen(true)}
          >
            View all activity
          </Button>
        </div>
      </CardContent>

      {/* All Activities Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>All Activities</DialogTitle>
            <DialogDescription>
              View all recent system activities
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {isLoadingAll ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">Loading activities...</p>
                </div>
              ) : Array.isArray(allActivities) && allActivities.length > 0 ? (
                allActivities.map((activity: any) => (
                  <div key={activity.id} className="flex items-start pb-4 border-b last:border-0">
                    <div className={`h-10 w-10 ${getActivityBackground(activity.type)} rounded-full flex items-center justify-center flex-shrink-0`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm text-gray-900">
                        {renderMessageContent(activity.message)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                        {activity.user && (
                          <span className="text-xs text-gray-400">• {activity.user}</span>
                        )}
                        {activity.reference && (
                          <span className="text-xs text-gray-400">• {activity.reference}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No activities found.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
