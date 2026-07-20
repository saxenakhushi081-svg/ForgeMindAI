import React, { useState } from 'react';
import { useRunComplianceCheck, useListComplianceReports, useListDocuments } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, ShieldAlert, FileText, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function Compliance() {
  const [standardType, setStandardType] = useState('factory_act');
  const [standardDoc, setStandardDoc] = useState('');
  const [companyDoc, setCompanyDoc] = useState('');

  const { data: docs } = useListDocuments({ limit: 100 });
  const { data: reports, isLoading: reportsLoading, refetch } = useListComplianceReports();
  const runMutation = useRunComplianceCheck();

  const handleRun = () => {
    if (!standardDoc || !companyDoc) return;
    runMutation.mutate({
      data: {
        standard_type: standardType as any,
        standard_document_ids: [standardDoc],
        company_document_ids: [companyDoc]
      }
    }, {
      onSuccess: () => refetch()
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Checker</h1>
        <p className="text-muted-foreground text-sm">Verify operational documents against regulatory standards.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runner Panel */}
        <Card className="lg:col-span-1 glass border-primary/20 bg-card/40">
          <CardHeader>
            <CardTitle className="text-lg">Run Assessment</CardTitle>
            <CardDescription>Select documents to compare</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Standard Framework</label>
              <Select value={standardType} onValueChange={setStandardType}>
                <SelectTrigger className="bg-black/30 border-white/10 text-white">
                  <SelectValue placeholder="Select standard" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-white/10">
                  <SelectItem value="factory_act">Factory Act 1948</SelectItem>
                  <SelectItem value="oisd">OISD Standards</SelectItem>
                  <SelectItem value="iso">ISO 45001</SelectItem>
                  <SelectItem value="custom">Custom Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Reference Standard Doc</label>
              <Select value={standardDoc} onValueChange={setStandardDoc}>
                <SelectTrigger className="bg-black/30 border-white/10 text-white">
                  <SelectValue placeholder="Select reference document" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-white/10">
                  {docs?.items.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.filename}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center text-muted-foreground py-2">
              <ArrowRight className="w-5 h-5 rotate-90" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Company Document to Check</label>
              <Select value={companyDoc} onValueChange={setCompanyDoc}>
                <SelectTrigger className="bg-black/30 border-white/10 text-white">
                  <SelectValue placeholder="Select company document" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-white/10">
                  {docs?.items.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.filename}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full shadow-[0_0_15px_rgba(59,130,246,0.3)] mt-4" 
              onClick={handleRun}
              disabled={runMutation.isPending || !standardDoc || !companyDoc}
            >
              {runMutation.isPending ? 'Analyzing...' : 'Run Compliance Check'}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {runMutation.isPending ? (
            <Card className="glass border-white/10 bg-card/40 p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <ShieldCheck className="w-16 h-16 text-primary animate-pulse mb-6" />
              <h3 className="text-xl font-medium text-white mb-2">Cross-referencing clauses</h3>
              <p className="text-muted-foreground">Checking terminology, requirements, and safety thresholds...</p>
            </Card>
          ) : runMutation.data ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <Card className="glass border-white/10 bg-card/40">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                      {/* CSS circular progress representation */}
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" className="stroke-white/10" strokeWidth="8" fill="none" />
                        <circle 
                          cx="50" cy="50" r="40" 
                          className={`${runMutation.data.score > 80 ? 'stroke-success' : runMutation.data.score > 50 ? 'stroke-warning' : 'stroke-destructive'} transition-all duration-1000 ease-out`} 
                          strokeWidth="8" fill="none" 
                          strokeDasharray="251.2" 
                          strokeDashoffset={251.2 - (251.2 * runMutation.data.score) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-white">{runMutation.data.score}%</span>
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <div className="inline-flex items-center px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider mb-2">
                        {runMutation.data.status.replace('_', ' ')}
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2">Assessment Complete</h2>
                      <p className="text-muted-foreground text-sm leading-relaxed">{runMutation.data.summary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-white/10 bg-card/40">
                <CardHeader>
                  <CardTitle className="text-lg">Compliance Gaps</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                    {runMutation.data.gaps.map((gap, i) => (
                      <div key={i} className="p-4 flex gap-4">
                        <div className="shrink-0 mt-1">
                          {gap.severity === 'critical' ? <XCircle className="w-5 h-5 text-destructive" /> :
                           gap.severity === 'high' ? <ShieldAlert className="w-5 h-5 text-warning" /> :
                           <AlertTriangle className="w-5 h-5 text-blue-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white text-sm">{gap.section}</span>
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                              gap.severity === 'critical' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                              gap.severity === 'high' ? 'bg-warning/10 text-warning border-warning/20' :
                              'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>{gap.severity}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{gap.description}</p>
                          {gap.reference && <p className="text-xs text-white/50 mt-1 font-mono">Ref: {gap.reference}</p>}
                        </div>
                      </div>
                    ))}
                    {runMutation.data.gaps.length === 0 && (
                      <div className="p-8 text-center text-success flex flex-col items-center">
                        <CheckCircle className="w-12 h-12 mb-2 opacity-50" />
                        No gaps found! Fully compliant.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="glass border-white/10 bg-card/40">
              <CardHeader>
                <CardTitle className="text-lg">Recent Reports</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {reportsLoading ? (
                  <div className="p-4 space-y-4">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full bg-white/5" />)}
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {reports?.map(report => (
                      <div key={report.id} className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                            report.score > 80 ? 'border-success text-success bg-success/10' : 
                            report.score > 50 ? 'border-warning text-warning bg-warning/10' : 
                            'border-destructive text-destructive bg-destructive/10'
                          }`}>
                            {report.score}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white uppercase tracking-wider">{report.standard_type?.replace('_', ' ')}</div>
                            <div className="text-xs text-muted-foreground">{format(new Date(report.created_at), 'MMM dd, yyyy')}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-1 rounded">
                             {report.gaps.length} gaps
                           </span>
                        </div>
                      </div>
                    ))}
                    {reports?.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm">No recent compliance reports.</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}