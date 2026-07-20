import React, { useState, useRef, useEffect } from 'react';
import { 
  useListChatSessions, 
  useCreateChatSession, 
  useGetChatMessages, 
  useSendChatMessage,
  useGetSuggestedQuestions,
  ChatMessage
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Plus, MessageSquare, Send, Bot, User as UserIcon, 
  Loader2, Globe, FileText, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function Chat() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading: sessionsLoading } = useListChatSessions();
  const { data: messages, isLoading: messagesLoading } = useGetChatMessages(activeSessionId || '', {
    query: { enabled: !!activeSessionId, queryKey: ['/api/chat/sessions', activeSessionId, 'messages'] }
  });
  const { data: suggestions } = useGetSuggestedQuestions();

  const createMutation = useCreateChatSession();
  const sendMutation = useSendChatMessage();

  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCreateSession = () => {
    createMutation.mutate({ data: { title: 'New Conversation' } }, {
      onSuccess: (newSession) => {
        setActiveSessionId(newSession.id);
        queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions'] });
      }
    });
  };

  const handleSend = (text: string) => {
    if (!text.trim() || !activeSessionId) return;

    // Optimistically update UI
    const newMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: activeSessionId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };

    queryClient.setQueryData(['/api/chat/sessions', activeSessionId, 'messages'], (old: any) => {
      return [...(old || []), newMessage];
    });

    setInput('');

    sendMutation.mutate({ 
      id: activeSessionId, 
      data: { content: text, language } 
    }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions', activeSessionId, 'messages'] });
        queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions'] }); // Update last message preview
      },
      onError: () => {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message.' });
        // Rollback optimistic update
        queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions', activeSessionId, 'messages'] });
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-card/20 rounded-xl overflow-hidden border border-white/10 max-w-7xl mx-auto">
      {/* Sidebar */}
      <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col hidden md:flex">
        <div className="p-4 border-b border-sidebar-border">
          <Button onClick={handleCreateSession} className="w-full bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 shadow-none">
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-1">
            {sessionsLoading ? (
              [1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full bg-white/5 rounded-lg" />)
            ) : (
              sessions?.map(session => (
                <button
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex flex-col gap-1 ${
                    activeSessionId === session.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-sm text-white truncate">{session.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{session.last_message || 'New session'}</div>
                </button>
              ))
            )}
            {sessions?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No chat history.<br/>Start a new conversation.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background/50 relative">
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-card/30 backdrop-blur-md">
          <div className="font-medium text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" /> ForgeMind Assistant
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')}
            className="border-white/10 bg-white/5 h-8 text-xs"
          >
            <Globe className="w-3 h-3 mr-2" />
            {language === 'en' ? 'English' : 'हिंदी'}
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messagesLoading && activeSessionId ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary/50" /></div>
          ) : !activeSessionId ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Bot className="w-16 h-16 text-primary/20 mb-4" />
              <p>Select or create a chat session</p>
            </div>
          ) : messages?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">How can I help you today?</h3>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                I can answer questions based on your uploaded manuals, logs, and safety documents.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestions?.map((q, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(q)}
                    className="p-3 text-left text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto w-full">
              {messages?.map(msg => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${
                    msg.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-sidebar-accent border border-white/10 text-white'
                  }`}>
                    {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-card border border-white/10 text-card-foreground rounded-tl-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                    }`}>
                      <div className="whitespace-pre-wrap leading-relaxed text-sm">
                        {msg.content}
                      </div>
                    </div>
                    
                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.sources.map((src, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-muted-foreground max-w-[200px]" title={src.excerpt}>
                            <FileText className="w-3 h-3 text-primary" />
                            <span className="truncate">{src.filename}</span>
                            {src.page_number && <span className="opacity-50">p.{src.page_number}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {sendMutation.isPending && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded bg-sidebar-accent border border-white/10 text-white shrink-0 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-card border border-white/10 rounded-tl-sm flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-150" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-300" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background/80 backdrop-blur border-t border-white/5">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="max-w-4xl mx-auto relative flex items-end gap-2"
          >
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a machine, manual, or safety rule..."
                className="pr-12 bg-card/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary h-12 shadow-inner"
                disabled={!activeSessionId || sendMutation.isPending}
              />
            </div>
            <Button 
              type="submit" 
              disabled={!input.trim() || !activeSessionId || sendMutation.isPending}
              className="h-12 w-12 shrink-0 p-0 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              <Send className="w-5 h-5 ml-1" />
            </Button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-muted-foreground/60">ForgeMind AI can make mistakes. Check critical engineering info.</span>
          </div>
        </div>
      </div>
    </div>
  );
}