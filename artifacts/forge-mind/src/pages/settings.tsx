import React from 'react';
import { useGetSettings, useUpdateSettings } from '@workspace/api-client-react';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Bell, Key, Shield, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const settingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  language: z.enum(['en', 'hi']),
  notifications_enabled: z.boolean(),
  email_alerts: z.boolean(),
  gemini_api_key: z.string().optional(),
});

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings();
  const updateMutation = useUpdateSettings();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      theme: 'dark',
      language: 'en',
      notifications_enabled: true,
      email_alerts: true,
      gemini_api_key: ''
    }
  });

  React.useEffect(() => {
    if (settings) {
      form.reset({
        theme: settings.theme as any,
        language: settings.language as any,
        notifications_enabled: settings.notifications_enabled,
        email_alerts: settings.email_alerts,
        gemini_api_key: settings.gemini_api_key || ''
      });
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof settingsSchema>) => {
    updateMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: 'Settings updated successfully' });
      }
    });
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Preferences</h1>
        <p className="text-muted-foreground text-sm">Manage your account and platform settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 space-y-1 hidden md:block">
          <Button variant="ghost" className="w-full justify-start bg-white/5 text-white">Profile</Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground">Platform</Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground">Security</Button>
        </div>

        <div className="col-span-1 md:col-span-3 space-y-8">
          {/* Profile Read-Only */}
          <Card className="glass border-white/10 bg-card/40">
            <CardHeader>
              <CardTitle className="text-lg flex items-center"><User className="w-5 h-5 mr-2 text-primary" /> Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">{user?.name}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                <div>
                  <label className="text-xs text-muted-foreground">Company</label>
                  <div className="text-sm font-medium text-white">{user?.company || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Role</label>
                  <div className="text-sm font-medium text-white capitalize">{user?.role}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <Card className="glass border-white/10 bg-card/40">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center"><SettingsIcon className="w-5 h-5 mr-2 text-primary" /> Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Platform Language</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-black/30 border-white/10">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover border-white/10">
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="hi">Hindi (हिंदी)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Theme</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-black/30 border-white/10">
                                <SelectValue placeholder="Select theme" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover border-white/10">
                              <SelectItem value="dark">Dark Mode</SelectItem>
                              <SelectItem value="light">Light Mode</SelectItem>
                              <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-sm font-medium text-white flex items-center"><Bell className="w-4 h-4 mr-2" /> Notifications</h4>
                    <FormField
                      control={form.control}
                      name="notifications_enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/5 p-4 bg-black/20">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base text-white">In-App Notifications</FormLabel>
                            <FormDescription>Receive alerts within the platform.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email_alerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/5 p-4 bg-black/20">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base text-white">Email Alerts</FormLabel>
                            <FormDescription>Critical alerts sent to your inbox.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-white/10 bg-card/40">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center"><Key className="w-5 h-5 mr-2 text-primary" /> API Configuration</CardTitle>
                  <CardDescription>Bring your own LLM keys if required by your tier.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="gemini_api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Google Gemini API Key</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="AIzaSy..." {...field} className="bg-black/30 border-white/10" />
                        </FormControl>
                        <FormDescription>Stored securely via AES-256 encryption.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending} className="px-8 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>

            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}