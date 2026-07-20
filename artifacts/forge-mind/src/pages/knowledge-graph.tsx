import React, { useEffect, useRef, useState } from 'react';
import { useGetKnowledgeGraph, useListKnowledgeEntities, useExtractKnowledgeGraph } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Network, Search, RefreshCw, Server, Users, Factory, ShieldAlert, Cpu } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function KnowledgeGraphPage() {
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const { data: entities, isLoading: entitiesLoading } = useListKnowledgeEntities({});
  const { data: graph, isLoading: graphLoading, refetch } = useGetKnowledgeGraph();
  const extractMutation = useExtractKnowledgeGraph();

  const handleExtract = () => {
    extractMutation.mutate(undefined, {
      onSuccess: () => refetch()
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Facility Knowledge Graph</h1>
          <p className="text-sm text-muted-foreground">Interactive visualization of entities and their relationships extracted from documents.</p>
        </div>
        <Button onClick={handleExtract} disabled={extractMutation.isPending} className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30">
          <RefreshCw className={`w-4 h-4 mr-2 ${extractMutation.isPending ? 'animate-spin' : ''}`} />
          {extractMutation.isPending ? 'Extracting...' : 'Re-extract Data'}
        </Button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Entity List */}
        <Card className="w-72 flex flex-col bg-card/40 border-white/10 glass hidden md:flex">
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Filter entities..." 
                className="h-9 pl-9 bg-black/20 border-white/5 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1 p-3">
            {entitiesLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full bg-white/5" />)}
              </div>
            ) : (
              <div className="space-y-1">
                {entities?.filter(e => e.label.toLowerCase().includes(search.toLowerCase())).map(entity => (
                  <div key={entity.id} className="p-2 rounded hover:bg-white/5 cursor-pointer flex items-center gap-3">
                    <NodeTypeIcon type={entity.type} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white truncate">{entity.label}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{entity.type} • {entity.mention_count} mentions</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Graph Canvas */}
        <Card className="flex-1 relative bg-[#040810] border-white/10 overflow-hidden flex flex-col">
          {graphLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center text-primary animate-pulse">
                <Network className="w-12 h-12 mb-4 opacity-50" />
                <span>Loading neural map...</span>
              </div>
            </div>
          ) : graph ? (
            <GraphCanvas 
              nodes={graph.nodes} 
              edges={graph.edges} 
              onNodeClick={setSelectedNode} 
            />
          ) : null}

          {/* Node Info Overlay */}
          {selectedNode && (
            <div className="absolute top-4 right-4 w-64 bg-card/90 backdrop-blur-xl border border-white/10 rounded-lg p-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
                <NodeTypeIcon type={selectedNode.type} />
                <div>
                  <h4 className="font-bold text-white">{selectedNode.label}</h4>
                  <span className="text-xs text-primary capitalize">{selectedNode.type}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID</span>
                  <span className="text-white font-mono text-xs">{selectedNode.id.substring(0, 8)}...</span>
                </div>
                {selectedNode.properties && Object.entries(selectedNode.properties).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">{k}</span>
                    <span className="text-white">{String(v)}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="text-white">{selectedNode.document_ids?.length || 0}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4 border-white/10"
                onClick={() => setSelectedNode(null)}
              >
                Close
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function NodeTypeIcon({ type }: { type: string }) {
  switch(type) {
    case 'machine': return <Server className="w-5 h-5 text-blue-400" />;
    case 'engineer': return <Users className="w-5 h-5 text-green-400" />;
    case 'department': return <Factory className="w-5 h-5 text-orange-400" />;
    case 'equipment': return <Cpu className="w-5 h-5 text-purple-400" />;
    case 'safety_rule': return <ShieldAlert className="w-5 h-5 text-red-400" />;
    default: return <Network className="w-5 h-5 text-gray-400" />;
  }
}

// Custom simple force-directed graph implementation using Canvas
function GraphCanvas({ nodes, edges, onNodeClick }: { nodes: any[], edges: any[], onNodeClick: (n: any) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = containerRef.current.clientWidth;
    let height = containerRef.current.clientHeight;
    
    canvas.width = width;
    canvas.height = height;

    // Initialize positions
    const simNodes = nodes.map(n => ({
      ...n,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      radius: n.type === 'machine' ? 12 : 8
    }));

    const simEdges = edges.map(e => ({
      source: simNodes.find(n => n.id === e.source),
      target: simNodes.find(n => n.id === e.target),
      relationship: e.relationship
    })).filter(e => e.source && e.target);

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Simple physics step
      const k = 0.5; // repulse
      const spring = 0.05; // attract

      // Repulsion
      for(let i=0; i<simNodes.length; i++) {
        for(let j=i+1; j<simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          if (dist < 150) {
            const force = k / dist;
            a.vx += (dx / dist) * force;
            a.vy += (dy / dist) * force;
            b.vx -= (dx / dist) * force;
            b.vy -= (dy / dist) * force;
          }
        }
      }

      // Attraction (edges)
      simEdges.forEach(e => {
        if (!e.source || !e.target) return;
        const dx = e.target.x - e.source.x;
        const dy = e.target.y - e.source.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const diff = dist - 100; // resting length
        const force = diff * spring;
        
        e.source.vx += (dx / dist) * force;
        e.source.vy += (dy / dist) * force;
        e.target.vx -= (dx / dist) * force;
        e.target.vy -= (dy / dist) * force;
      });

      // Update positions & bounds & friction
      simNodes.forEach(n => {
        n.vx *= 0.8; // friction
        n.vy *= 0.8;
        n.x += n.vx;
        n.y += n.vy;

        // Bounce off walls
        if (n.x < 20) n.x = 20;
        if (n.x > width - 20) n.x = width - 20;
        if (n.y < 20) n.y = 20;
        if (n.y > height - 20) n.y = height - 20;
      });

      // Draw Edges
      ctx.lineWidth = 1;
      simEdges.forEach(e => {
        if (!e.source || !e.target) return;
        ctx.beginPath();
        ctx.moveTo(e.source.x, e.source.y);
        ctx.lineTo(e.target.x, e.target.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.stroke();

        // Label
        const mx = (e.source.x + e.target.x) / 2;
        const my = (e.source.y + e.target.y) / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(e.relationship, mx, my);
      });

      // Draw Nodes
      simNodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        
        let color = '#94a3b8'; // default
        if (n.type === 'machine') color = '#60a5fa';
        else if (n.type === 'engineer') color = '#4ade80';
        else if (n.type === 'department') color = '#fb923c';
        else if (n.type === 'safety_rule') color = '#f87171';
        
        ctx.fillStyle = color;
        ctx.fill();

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'white';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + n.radius + 12);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Click handler
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let clicked = null;
      for (const n of simNodes) {
        const dist = Math.sqrt(Math.pow(n.x - clickX, 2) + Math.pow(n.y - clickY, 2));
        if (dist < n.radius + 5) {
          clicked = n;
          break;
        }
      }
      if (clicked) onNodeClick(nodes.find(orig => orig.id === clicked.id));
    };

    canvas.addEventListener('click', handleClick);

    const handleResize = () => {
      width = containerRef.current!.clientWidth;
      height = containerRef.current!.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleClick);
    };
  }, [nodes, edges, onNodeClick]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />
    </div>
  );
}