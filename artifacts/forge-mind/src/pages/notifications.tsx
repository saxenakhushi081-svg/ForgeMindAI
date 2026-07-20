import React from 'react';
import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, ShieldAlert, FileText, Settings, Search, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

export default function Notifications() {
  const { data, isLoading } = useListNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] })
    });
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] })
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'upload': return <FileText className="w-5 h-5 text-blue-400" />;
      case 'compliance_alert': return <ShieldAlert className="w-5 h-5 text-warning" />;
      case 'maintenance_alert': return <Settings className="w-5 h-5 text-destructive" />;
      case 'rca': return <Search className="w-5 h-5 text-primary" />;
      default: return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm">Updates and alerts from the platform.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleMarkAllRead} 
          disabled={!data || data.filter(n => !n.is_read).length === 0 || markAllReadMutation.isPending}
          className="bg-card/40 border-white/10 hover:bg-white/10"
        >
          <CheckCheck className="w-4 h-4 mr-2" /> Mark all read
        </Button>
      </div>

      <Card className="glass border-white/10 bg-card/40">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full bg-white/5" />)}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {data?.map(notif => (
                <div 
                  key={notif.id} 
                  className={`p-4 flex gap-4 transition-colors ${notif.is_read ? 'opacity-60' : 'bg-primary/5'}`}
                  onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.is_read ? 'bg-white/5' : 'bg-background shadow-[0_0_10px_rgba(59,130,246,0.2)]'}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm font-medium ${notif.is_read ? 'text-white/80' : 'text-white'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-4">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{notif.message}</p>
                  </div>
                  {!notif.is_read && (
                    <div className="shrink-0 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              ))}
              {data?.length === 0 && (
                <div className="p-12 flex flex-col items-center text-muted-foreground">
                  <Bell className="w-12 h-12 opacity-20 mb-4" />
                  <p>You're all caught up.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}