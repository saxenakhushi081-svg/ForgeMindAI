import React, { useState } from 'react';
import { useAnalyzeRootCause, useGetRcaHistory } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Search, History, Activity, AlertTriangle, Lightbulb, Link as LinkIcon, Cpu, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';

export default function RCA() {
  const [query, setQuery] = useState('');
  const [machineId, setMachineId] = useState('');
  
  const { data: history, isLoading: historyLoading } = useGetRcaHistory();
  const analyzeMutation = useAnalyzeRootCause();

  const handleAnalyze = () => {
    if (!query.trim()) return;
    analyzeMutation.mutate({
      data: {
        query,
        machine_id: machineId || undefined
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Root Cause Analysis</h1>
        <p className="text-muted-foreground text-sm">AI-driven diagnostic tool for equipment failures.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Query & History */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass border-primary/20 bg-card/40">
            <CardHeader>
              <CardTitle className="text-lg flex items-center text-primary">
                <Search className="w-5 h-5 mr-2" /> New Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/80 mb-1.5 block">Failure Description</label>
                <Textarea 
                  placeholder="e.g. Turbine 4 vibration exceeded threshold, pressure dropped by 15% before shutdown..."
                  className="bg-black/30 border-white/10 min-h-[100px] resize-none"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/80 mb-1.5 block">Machine ID (Optional)</label>
                <div className="relative">
                  <Cpu className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="e.g. TRB-004"
                    className="bg-black/30 border-white/10 pl-9"
                    value={machineId}
                    onChange={e => setMachineId(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                className="w-full shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || !query.trim()}
              >
                {analyzeMutation.isPending ? 'Analyzing...' : 'Run Diagnostics'}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-white/10 bg-card/40">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <History className="w-5 h-5 mr-2" /> Recent Analyses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                {historyLoading ? (
                  <div className="p-4 space-y-3">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full bg-white/5" />)}
                  </div>
                ) : (
                  history?.map(item => (
                    <div key={item.id} className="p-4 hover:bg-white/5 cursor-pointer transition-colors">
                      <div className="text-sm font-medium text-white line-clamp-2 mb-1">{item.query}</div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{item.machine_id || 'General'}</span>
                        <span>{format(new Date(item.created_at), 'MMM dd')}</span>
                      </div>
                    </div>
                  ))
                )}
                {history?.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">No history found.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Results */}
        <div className="lg:col-span-2">
          {analyzeMutation.isPending ? (
            <Card className="glass border-white/10 bg-card/40 h-full min-h-[500px] flex flex-col items-center justify-center p-8 text-center">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                <Activity className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Analyzing Knowledge Base</h3>
              <p className="text-muted-foreground max-w-md">
                Cross-referencing symptoms with maintenance logs, machine manuals, and historical incident reports...
              </p>
            </Card>
          ) : analyzeMutation.data ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Summary */}
              <Card className="glass border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-white mb-2">Diagnostic Summary</h3>
                  <p className="text-white/80 leading-relaxed">{analyzeMutation.data.summary}</p>
                </CardContent>
              </Card>

              {/* Causes Chart */}
              <Card className="glass border-white/10 bg-card/40">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 text-warning" /> Potential Root Causes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {analyzeMutation.data.root_causes.map((rc, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded mr-2">
                            {rc.category}
                          </span>
                          <span className="text-sm font-medium text-white">{rc.cause}</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{Math.round(rc.confidence * 100)}%</span>
                      </div>
                      <Progress 
                        value={rc.confidence * 100} 
                        className="h-2 bg-white/5" 
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recommendations */}
                <Card className="glass border-white/10 bg-card/40">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Lightbulb className="w-5 h-5 mr-2 text-success" /> Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {analyzeMutation.data.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Similar Incidents */}
                <Card className="glass border-white/10 bg-card/40">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <LinkIcon className="w-5 h-5 mr-2 text-blue-400" /> Similar Incidents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                      {analyzeMutation.data.similar_incidents?.map((inc, i) => (
                        <div key={i} className="p-4">
                          <div className="text-sm font-medium text-white mb-1">{inc.description}</div>
                          <div className="text-xs text-success bg-success/10 p-2 rounded mt-2 border border-success/20">
                            <strong>Resolution:</strong> {inc.resolution}
                          </div>
                          {inc.date && <div className="text-[10px] text-muted-foreground mt-2">{inc.date}</div>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="glass border-white/5 bg-card/20 h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8">
              <Search className="w-16 h-16 text-white/10 mb-4" />
              <h3 className="text-xl font-medium text-white/40">Ready to Analyze</h3>
              <p className="text-white/20 mt-2">Enter failure symptoms on the left to begin.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}