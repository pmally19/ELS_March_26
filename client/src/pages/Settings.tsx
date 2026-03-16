import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user settings
  const { data: userSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/user-settings'],
    queryFn: async () => {
      const res = await fetch('/api/user-settings', {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch user settings');
      return res.json();
    },
  });

  // Fetch available languages
  const { data: languages = [], isLoading: isLoadingLanguages } = useQuery({
    queryKey: ['/api/settings/languages'],
    queryFn: async () => {
      const res = await fetch('/api/settings/languages', {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch available timezones
  const { data: timezones = [], isLoading: isLoadingTimezones } = useQuery({
    queryKey: ['/api/settings/timezones'],
    queryFn: async () => {
      const res = await fetch('/api/settings/timezones', {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Local state for form
  const [settings, setSettings] = useState({
    language: userSettings?.language || 'en',
    timezone: userSettings?.timezone || 'UTC',
    emailNotifications: userSettings?.emailNotifications ?? true,
    pushNotifications: userSettings?.pushNotifications ?? false,
    soundAlerts: userSettings?.soundAlerts ?? true,
  });

  // Update settings when userSettings loads
  useEffect(() => {
    if (userSettings) {
      setSettings(prev => ({
        ...prev,
        language: userSettings.language || prev.language,
        timezone: userSettings.timezone || prev.timezone,
        emailNotifications: userSettings.emailNotifications !== undefined ? userSettings.emailNotifications : prev.emailNotifications,
        pushNotifications: userSettings.pushNotifications !== undefined ? userSettings.pushNotifications : prev.pushNotifications,
        soundAlerts: userSettings.soundAlerts !== undefined ? userSettings.soundAlerts : prev.soundAlerts,
      }));
    }
  }, [userSettings]);

  // Mutation to update settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      const res = await apiRequest('/api/user-settings', {
        method: 'PUT',
        body: JSON.stringify(newSettings)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-settings'] });
      toast({ 
        title: "Success", 
        description: "Settings updated successfully" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to update settings", 
        variant: "destructive" 
      });
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-medium">Application Preferences</h3>
                <p className="text-sm text-muted-foreground">
                  Configure your application-wide preferences.
                </p>
              </div>
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium">Language</p>
                <Select
                  value={settings.language}
                  onValueChange={(value) => setSettings({ ...settings, language: value })}
                  disabled={isLoadingLanguages}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingLanguages ? (
                      <SelectItem value="loading" disabled>Loading languages...</SelectItem>
                    ) : languages.length > 0 ? (
                      languages.map((lang: any) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium">Time Zone</p>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                  disabled={isLoadingTimezones}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTimezones ? (
                      <SelectItem value="loading" disabled>Loading timezones...</SelectItem>
                    ) : timezones.length > 0 ? (
                      timezones.map((tz: any) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4">
                <Button 
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save General Settings'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-medium">Theme Preferences</h3>
                <p className="text-sm text-muted-foreground">
                  Customize how the application looks.
                </p>
              </div>
              <div className="flex space-x-4">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                >
                  Light Mode
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                >
                  Dark Mode
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  onClick={() => setTheme("system")}
                >
                  System
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-medium">Notification Preferences</h3>
                <p className="text-sm text-muted-foreground">
                  Configure how you receive notifications.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email-notifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, emailNotifications: checked === true })
                  }
                />
                <label htmlFor="email-notifications" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Email Notifications
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="push-notifications"
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, pushNotifications: checked === true })
                  }
                />
                <label htmlFor="push-notifications" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Push Notifications
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sound-alerts"
                  checked={settings.soundAlerts}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, soundAlerts: checked === true })
                  }
                />
                <label htmlFor="sound-alerts" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Sound Alerts
                </label>
              </div>
              <div className="pt-4">
                <Button 
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Notification Settings'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-medium">Account Security</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your account security preferences.
                </p>
              </div>
              <Button variant="default">Change Password</Button>
              <div className="pt-4">
                <div className="space-y-1">
                  <h3 className="font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account.
                  </p>
                </div>
                <Button variant="outline" className="mt-2">
                  Enable Two-Factor Authentication
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}