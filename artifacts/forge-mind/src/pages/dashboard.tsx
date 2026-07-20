import React from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  FileText, Activity, ShieldAlert, Cpu, 
  ArrowUpRight, ArrowDownRight, Upload, 
  MessageSquare, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { 
  useGetDashboardStats, 
  useGetDashboardAiUsage, 
  useGetDashboardActivity, 
  useListDocuments 
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const [_, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: aiUsage, isLoading: aiLoading } = useGetDashboardAiUsage();
  const { data: activity, isLoading: activityLoading } = useGetDashboardActivity({ limit: 5 });
  const { data: docsRes, isLoading: docsLoading } = useListDocuments({ limit: 4 });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => setLocation('/documents')} className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
          <Upload className="w-4 h-4 mr-2" /> Upload Document
        </Button>
        <Button onClick={() => setLocation('/chat')} className="bg-sidebar-accent text-white hover:bg-sidebar-accent/80 border border-white/10">
          <MessageSquare className="w-4 h-4 mr-2" /> New AI Chat
        </Button>
        <Button onClick={() => setLocation('/rca')} className="bg-sidebar-accent text-white hover:bg-sidebar-accent/80 border border-white/10">
          <AlertTriangle className="w-4 h-4 mr-2" /> Run RCA
        </Button>
        <Button onClick={() => setLocation('/compliance')} className="bg-sidebar-accent text-white hover:bg-sidebar-accent/80 border border-white/10">
          <ShieldAlert className="w-4 h-4 mr-2" /> Check Compliance
        </Button>
      </div>

      {/* Stats Row */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatsCard 
          title="Total Documents" 
          value={stats?.total_documents} 
          icon={FileText}
          loading={statsLoading}
          trend={stats?.document_growth}
        />
        <StatsCard 
          title="Machines Tracked" 
          value={stats?.total_machines} 
          icon={Cpu}
          loading={statsLoading}
        />
        <StatsCard 
          title="Compliance Score" 
          value={`${stats?.compliance_score || 0}%`} 
          icon={CheckCircle2}
          loading={statsLoading}
          trend={stats?.compliance_change}
          valueColor={stats && stats.compliance_score > 90 ? 'text-success' : 'text-warning'}
        />
        <StatsCard 
          title="AI Queries (Today)" 
          value={stats?.ai_queries_today} 
          icon={Activity}
          loading={statsLoading}
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="glass border-white/10 bg-card/40">
            <CardHeader>
              <CardTitle className="text-lg font-medium">AI Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <Skeleton className="w-full h-[300px] bg-white/5" />
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={aiUsage?.daily_usage || []}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="rgba(255,255,255,0.4)" 
                        fontSize={12}
                        tickFormatter={(val) => format(new Date(val), 'MMM dd')}
                      />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--primary))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: 'white' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass border-white/10 bg-card/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Recent Documents</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/documents')} className="text-primary h-8">View All</Button>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="w-full h-16 bg-white/5" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {docsRes?.items.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                          {doc.file_type.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate text-white">{doc.filename}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), 'MMM dd, yyyy')} • {(doc.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <StatusBadge status={doc.status} />
                      </div>
                    </div>
                  ))}
                  {docsRes?.items.length === 0 && (
                    <p className="text-center text-muted-foreground py-4 text-sm">No documents found.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline Column */}
        <div className="lg:col-span-1">
          <Card className="glass border-white/10 bg-card/40 h-full">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-6">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4 bg-white/5" />
                        <Skeleton className="h-3 w-1/2 bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                  <div className="space-y-6 relative">
                    {activity?.map((item) => (
                      <div key={item.id} className="relative flex items-start justify-start">
                        <div className="absolute left-0 md:left-1/2 -ml-[9px] md:-ml-[9px] mt-1">
                          <div className="w-[18px] h-[18px] rounded-full bg-background border-2 border-primary shadow-[0_0_10px_rgba(59,130,246,0.5)] z-10" />
                        </div>
                        <div className="ml-8 md:ml-0 md:w-1/2 md:pr-10 md:text-right w-full">
                          {/* We only render on the right for all items in this simplified timeline layout to avoid complex left/right alternating logic */}
                        </div>
                        <div className="ml-8 md:ml-0 md:w-1/2 md:pl-10 w-full pb-6">
                          <div className="bg-white/5 border border-white/5 rounded-lg p-3 backdrop-blur-sm relative">
                            <div className="text-xs text-primary font-medium mb-1 capitalize">{item.type}</div>
                            <div className="font-medium text-sm text-white mb-1">{item.title}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">{item.description}</div>
                            <div className="text-[10px] text-muted-foreground/60 mt-2">
                              {format(new Date(item.created_at), 'MMM dd, HH:mm')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {activity?.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-4">No recent activity.</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, loading, trend, valueColor = "text-white" }: any) {
  return (
    <Card className="glass border-white/10 bg-card/40 hover:bg-card/60 transition-colors">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-24 bg-white/10" />
          ) : (
            <h3 className={`text-3xl font-bold font-sans tracking-tight ${valueColor}`}>{value !== undefined ? value : '-'}</h3>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ready: "bg-success/10 text-success border-success/20",
    processing: "bg-warning/10 text-warning border-warning/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
    ocr_needed: "bg-purple-500/10 text-purple-400 border-purple-500/20"
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-white/10 text-white border-white/20"}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

// Simple wrapper for AreaChart since Recharts has LineChart instead
const AreaChart = LineChart;