"use client";

import { useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AlertTriangle, Bot, ChevronDown, Maximize2, MessageSquareText, SendHorizonal, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useQueue } from '@/context/QueueContext';
import { cn } from '@/lib/utils';

type ChatMessage = ReturnType<typeof useChat>['messages'][number];

const QUICK_PROMPTS = [
  'What is the current waiting queue by department?',
  'Show today\'s wait-time trend.',
  'Which counter has the best completed-to-no-show ratio?',
];

function extractMessageText(message: ChatMessage) {
  return message.parts
    .map(part => {
      if (part.type === 'text') {
        return part.text;
      }

      if (part.type === 'reasoning') {
        return part.text;
      }

      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function ChatBubble({
  message,
}: {
  message: ChatMessage;
}) {
  const isAssistant = message.role === 'assistant';
  const text = extractMessageText(message);

  return (
    <div className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[85%] rounded-[1.5rem] px-4 py-3 text-sm shadow-sm border',
          isAssistant
            ? 'bg-white/75 text-secondary border-white/60'
            : 'bg-secondary text-white border-secondary/20',
        )}
      >
        <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] opacity-70">
          <span>{isAssistant ? 'Queue Orchestrator' : 'You'}</span>
          {message.metadata && message.metadata !== null ? (
            <Badge variant="outline" className="border-white/20 text-[9px] uppercase tracking-[0.2em]">
              Live
            </Badge>
          ) : null}
        </div>
        <div className="whitespace-pre-wrap leading-6">{text || '...'} </div>
      </div>
    </div>
  );
}

function QueueOrchestratorChatContent() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({ api: '/api/orchestrator' }),
  });

  const isBusy = status === 'submitted' || status === 'streaming';

  const promptHelper = useMemo(() => {
    if (status === 'error') {
      return 'The orchestrator hit an error. Try again or refresh the conversation.';
    }

    if (status === 'streaming') {
      return 'Streaming a live queue analysis.';
    }

    return 'Ask for queue counts, wait time trends, or counter performance.';
  }, [status]);

  useEffect(() => {
    if (status === 'error' && error) {
      console.error('Queue Orchestrator chat error:', error);
    }
  }, [error, status]);

  const handleSubmit = async () => {
    const trimmed = draft.trim();

    if (!trimmed || isBusy) {
      return;
    }

    await sendMessage({ text: trimmed });
    setDraft('');
    clearError();
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (isBusy) {
      return;
    }

    await sendMessage({ text: prompt });
    clearError();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {isOpen ? (
        <Card className="w-[min(92vw,22rem)] overflow-hidden border-white/40 bg-white/45 p-0 shadow-[0_24px_80px_rgba(10,20,40,0.22)] backdrop-blur-2xl">
          <div className="flex items-start justify-between border-b border-white/40 px-4 py-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary text-white shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[11px] font-black uppercase tracking-[0.22em] text-secondary">Queue Orchestrator</h2>
                  <p className="text-[10px] font-medium text-muted-foreground">Admin dashboard assistant</p>
                </div>
              </div>
              <p className="text-[10px] font-medium leading-4 text-muted-foreground">{promptHelper}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsOpen(false)}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="px-3 py-2.5">
            <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground">
              <MessageSquareText className="h-3 w-3" />
              Quick prompts
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleQuickPrompt(prompt)}
                  className="rounded-full border border-white/70 bg-white/60 px-2.5 py-1 text-left text-[10px] font-bold leading-4 text-secondary shadow-sm transition hover:bg-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="h-[12rem] px-3 pb-2">
            <div className="space-y-2.5 pr-1">
              {messages.map(message => <ChatBubble key={message.id} message={message} />)}

              {status === 'streaming' ? (
                <div className="flex justify-start">
                  <div className="rounded-[1.25rem] border border-white/60 bg-white/70 px-3 py-2.5 text-xs text-muted-foreground shadow-sm">
                    Analyzing live queue data...
                  </div>
                </div>
              ) : null}

              {status === 'error' && error ? (
                <div className="rounded-[1.25rem] border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <div className="mb-1 flex items-center gap-2 font-black uppercase tracking-[0.2em]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Orchestrator error
                  </div>
                  <p>{error.message}</p>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <div className="border-t border-white/40 p-3">
            <div className="space-y-2.5">
              <Textarea
                value={draft}
                onChange={event => setDraft(event.target.value)}
                placeholder="Ask the Queue Orchestrator..."
                className="min-h-[60px] rounded-[1.1rem] border-white/60 bg-white/75 text-sm shadow-inner"
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-medium text-muted-foreground">Enter to send, Shift+Enter for a new line.</p>
                <Button
                  onClick={() => void handleSubmit()}
                  disabled={!draft.trim() || isBusy}
                  className="rounded-full bg-primary px-4 text-xs font-bold shadow-lg"
                >
                  {isBusy ? <Maximize2 className="mr-2 h-3.5 w-3.5 animate-pulse" /> : <SendHorizonal className="mr-2 h-3.5 w-3.5" />}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="relative flex items-center justify-end">
        <Button
          onClick={() => setIsOpen(prev => !prev)}
          aria-label={isOpen ? 'Close orchestrator chat' : 'Open orchestrator chat'}
          className="h-12 w-12 rounded-full bg-secondary p-0 font-bold shadow-2xl hover:bg-secondary/90"
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export function QueueOrchestratorChat() {
  const { isAdmin, isUserLoading } = useQueue();

  if (isUserLoading || !isAdmin) {
    return null;
  }

  return <QueueOrchestratorChatContent />;
}