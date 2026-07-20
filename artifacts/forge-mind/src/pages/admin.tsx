import React from 'react';
import { useAdminListUsers, useAdminGetAnalytics, useAdminListDocuments, useAdminDeleteUser } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FileText, Activity, Trash2, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Admin() {
  const { data: analytics, isLoading: analyticsLoading } = useAdminGetAnalytics();
  const { data: users, isLoading: usersLoading } = useAdminListUsers();
  const { data: docs, isLoading: docsLoading } = useAdminListDocuments();
  const deleteUserMutation = useAdminDeleteUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDeleteUser = (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'User deleted' });
          queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        }
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-8 h-8 text-destructive" />
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Console</h1>
          <p className="text-muted-foreground text-sm">System-wide overview and management.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass border-white/10 bg-card/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Users</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            {analyticsLoading ? <Skeleton className="h-8 w-16 bg-white/10" /> : <div className="text-3xl font-bold text-white">{analytics?.total_users}</div>}
          </CardContent>
        </Card>
        <Card className="glass border-white/10 bg-card/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Documents</span>
              <FileText className="w-4 h-4 text-primary" />
            </div>
            {analyticsLoading ? <Skeleton className="h-8 w-16 bg-white/10" /> : <div className="text-3xl font-bold text-white">{analytics?.total_documents}</div>}
          </CardContent>
        </Card>
        <Card className="glass border-white/10 bg-card/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Queries</span>
              <Activity className="w-4 h-4 text-primary" />
            </div>
            {analyticsLoading ? <Skeleton className="h-8 w-16 bg-white/10" /> : <div className="text-3xl font-bold text-white">{analytics?.total_queries}</div>}
          </CardContent>
        </Card>
        <Card className="glass border-white/10 bg-card/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Storage Used</span>
              <Activity className="w-4 h-4 text-primary" />
            </div>
            {analyticsLoading ? <Skeleton className="h-8 w-16 bg-white/10" /> : <div className="text-3xl font-bold text-white">{analytics?.storage_used_mb} MB</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass border-white/10 bg-card/40">
          <CardHeader>
            <CardTitle className="text-lg">Daily Signups</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? <Skeleton className="h-[250px] w-full bg-white/5" /> : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.daily_signups || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} tickFormatter={v => format(new Date(v), 'MM/dd')} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)' }} />
                    <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={{ r: 4, fill: '#60a5fa' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/10 bg-card/40">
          <CardHeader>
            <CardTitle className="text-lg">Document Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? <Skeleton className="h-[250px] w-full bg-white/5" /> : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.document_categories || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                    <YAxis dataKey="topic" type="category" width={100} stroke="rgba(255,255,255,0.4)" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)' }} />
                    <Bar dataKey="count" fill="#4ade80" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-white/10 bg-card/40">
        <CardHeader>
          <CardTitle className="text-lg">User Management</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-white/80">
              <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-white/5">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={5} className="p-4"><Skeleton className="h-10 w-full bg-white/5" /></td></tr>
                ) : users?.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-3 font-medium text-white">{u.name}</td>
                    <td className="px-6 py-3">{u.email}</td>
                    <td className="px-6 py-3"><span className="bg-primary/20 text-primary px-2 py-1 rounded text-[10px] uppercase font-bold">{u.role}</span></td>
                    <td className="px-6 py-3">{u.company || '-'}</td>
                    <td className="px-6 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}