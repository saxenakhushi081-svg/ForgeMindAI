import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { 
  UploadCloud, FileText, Search, Trash2, 
  RefreshCw, File as FileIcon, FileDigit, FileType, 
  MoreVertical, FileArchive
} from 'lucide-react';
import { 
  useListDocuments, 
  useUploadDocument, 
  useDeleteDocument, 
  useReprocessDocument,
  Document
} from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Documents() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListDocuments(
    { search: search || undefined, category },
    { query: { queryKey: ['/api/documents', search, category] } }
  );

  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const reprocessMutation = useReprocessDocument();

  const handleFiles = (files: FileList | null) => {
  if (!files) return;

  Array.from(files).forEach((file) => {
    uploadMutation.mutate(
      {
        data: {
          file: file,
          category: "general",
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Document uploaded",
            description: `${file.name} uploaded successfully.`,
          });

          queryClient.invalidateQueries({
            queryKey: ["/api/documents"],
          });
        },

        onError: (err) => {
          console.error(err);

          toast({
            variant: "destructive",
            title: "Upload failed",
            description: `Failed to upload ${file.name}.`,
          });
        },
      }
    );
  });
};
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: 'Document deleted' });
        queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      }
    });
  };

  const handleReprocess = (id: string) => {
    reprocessMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: 'Reprocessing started' });
        queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Document Vault</h1>
          <p className="text-muted-foreground text-sm">Upload and manage your industrial knowledge base.</p>
        </div>
      </div>

      {/* Upload Zone */}
      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-white/10 bg-card/40 hover:bg-card/60'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => handleFiles(e.target.files)} 
          className="hidden" 
          multiple 
        />
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <UploadCloud className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-medium text-white mb-2">Drop your manuals and logs here</h3>
        <p className="text-muted-foreground text-sm text-center max-w-md mb-6">
          Support for PDF, DOCX, XLSX, TXT, and CSV. Documents are automatically parsed and added to the knowledge graph.
        </p>
        <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
          Browse Files
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/40 p-2 rounded-lg border border-white/5">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search filenames..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 border-white/10 focus-visible:ring-primary"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="border-white/10 bg-background/50" onClick={() => setCategory(undefined)}>
            All
          </Button>
          <Button variant="outline" className="border-white/10 bg-background/50" onClick={() => setCategory('manual')}>
            Manuals
          </Button>
          <Button variant="outline" className="border-white/10 bg-background/50" onClick={() => setCategory('log')}>
            Logs
          </Button>
        </div>
      </div>

      {/* Document Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-xl bg-card/60" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.items.map(doc => (
            <DocumentCard 
              key={doc.id} 
              doc={doc} 
              onDelete={() => handleDelete(doc.id)} 
              onReprocess={() => handleReprocess(doc.id)} 
            />
          ))}
          {data?.items.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card/30 rounded-xl border border-white/5">
              <FileArchive className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No documents found matching your criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentCard({ doc, onDelete, onReprocess }: { doc: Document, onDelete: () => void, onReprocess: () => void }) {
  const getIcon = (type: string) => {
    switch(type) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-400" />;
      case 'docx': return <FileIcon className="w-6 h-6 text-blue-400" />;
      case 'xlsx': case 'csv': return <FileDigit className="w-6 h-6 text-green-400" />;
      default: return <FileType className="w-6 h-6 text-primary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ready': return 'bg-success/20 text-success border-success/30';
      case 'processing': return 'bg-warning/20 text-warning border-warning/30 animate-pulse';
      case 'error': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-white/10 text-white border-white/20';
    }
  };

  return (
    <Card className="glass bg-card/40 border-white/10 hover:border-primary/50 transition-colors group">
      <CardContent className="p-5 flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center shrink-0 shadow-inner">
          {getIcon(doc.file_type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-white truncate pr-2" title={doc.filename}>{doc.filename}</h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-muted-foreground hover:text-white">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-white/10">
                <DropdownMenuItem onClick={onReprocess} className="cursor-pointer hover:bg-white/5">
                  <RefreshCw className="w-4 h-4 mr-2" /> Reprocess
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getStatusColor(doc.status)}`}>
              {doc.status}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {(doc.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Uploaded {format(new Date(doc.created_at), 'MMM dd, yyyy')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}