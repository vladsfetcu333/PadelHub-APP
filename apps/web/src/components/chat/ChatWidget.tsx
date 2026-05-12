/**
 * Floating chatbot widget — bottom-right corner button that opens a
 * slide-in panel with session sidebar and streaming chat. Only renders
 * for authenticated users.
 *
 * The streaming implementation uses fetch + a ReadableStream reader to
 * parse SSE frames (rather than the native EventSource, which doesn't
 * support POST bodies). Each `data: <json>` line is decoded as one of
 * the StreamEvent variants emitted by the backend.
 */

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Plus, Trash2, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

import { api, extractErrorMessage, tokenStorage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils';

interface SessionSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SessionMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  contextChunkIds: string[] | null;
  createdAt: string;
}

interface Source {
  id: string;
  source: string;
  label: string;
  similarity: number;
}

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';

export function ChatWidget() {
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [pendingSources, setPendingSources] = useState<Source[]>([]);
  const [pendingText, setPendingText] = useState('');
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingText]);

  // Load sessions when widget opens
  useEffect(() => {
    if (!open || !user) return;
    api
      .get<SessionSummary[]>('/api/chat/sessions')
      .then((res) => {
        setSessions(res.data);
        if (res.data.length > 0 && !activeSessionId) {
          void selectSession(res.data[0]!.id);
        }
      })
      .catch((err) => toast.error(extractErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  if (!user) return null;

  const selectSession = async (id: string) => {
    setActiveSessionId(id);
    setPendingText('');
    setPendingSources([]);
    try {
      const { data } = await api.get<{ messages: SessionMessage[] }>(`/api/chat/sessions/${id}`);
      setMessages(data.messages);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const newSession = async () => {
    try {
      const { data } = await api.post<SessionSummary>('/api/chat/sessions', {});
      setSessions((arr) => [data, ...arr]);
      setActiveSessionId(data.id);
      setMessages([]);
      setPendingText('');
      setPendingSources([]);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await api.delete(`/api/chat/sessions/${id}`);
      setSessions((arr) => arr.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    // Ensure we have a session
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const { data } = await api.post<SessionSummary>('/api/chat/sessions', {});
        sessionId = data.id;
        setActiveSessionId(sessionId);
        setSessions((arr) => [data, ...arr]);
      } catch (err) {
        toast.error(extractErrorMessage(err));
        return;
      }
    }

    setInput('');
    // Optimistic user-message append
    const localUserMsg: SessionMessage = {
      id: `local-${Date.now()}`,
      role: 'USER',
      content: text,
      contextChunkIds: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((arr) => [...arr, localUserMsg]);
    setPendingText('');
    setPendingSources([]);
    setStreaming(true);

    try {
      const token = tokenStorage.get();
      const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: text }),
      });

      if (!response.ok || !response.body) {
        const errBody = await response.text();
        throw new Error(errBody || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullText = '';
      let collectedSources: Source[] = [];

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse complete SSE frames separated by double-newline
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const dataLine = frame.split('\n').find((l) => l.startsWith('data: '));
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine.slice(6));
            if (payload.type === 'token') {
              fullText += payload.data ?? '';
              setPendingText(fullText);
            } else if (payload.type === 'sources') {
              collectedSources = payload.sources ?? [];
              setPendingSources(collectedSources);
            } else if (payload.type === 'error') {
              toast.error(payload.message ?? 'Eroare la asistent');
            }
          } catch {
            /* skip malformed frame */
          }
        }
      }

      // Persist the assistant message locally so the UI doesn't flicker
      // when we re-fetch (it already exists on the server).
      const assistantMsg: SessionMessage = {
        id: `local-asst-${Date.now()}`,
        role: 'ASSISTANT',
        content: fullText,
        contextChunkIds: collectedSources.map((s) => s.id),
        createdAt: new Date().toISOString(),
      };
      setMessages((arr) => [...arr, assistantMsg]);
      setPendingText('');
      // Keep sources visible on the last assistant message
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Asistent padel"
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[600px] max-h-[80vh] w-[680px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-brand-950 px-4 py-3 text-white">
            <p className="font-semibold">Asistent Padel</p>
            <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sessions sidebar */}
            <div className="flex w-44 flex-col border-r border-border bg-muted/30">
              <button
                onClick={newSession}
                className="m-2 inline-flex items-center justify-center gap-1 rounded-md bg-brand-700 px-2 py-1.5 text-xs text-white hover:bg-brand-800"
              >
                <Plus className="h-3.5 w-3.5" /> Conversație nouă
              </button>
              <div className="flex-1 overflow-y-auto">
                {sessions.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Nicio conversație.</p>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        'group flex items-center justify-between gap-1 border-b border-border px-2 py-2 text-xs',
                        activeSessionId === s.id && 'bg-brand-50',
                      )}
                    >
                      <button
                        onClick={() => selectSession(s.id)}
                        className="flex-1 text-left"
                        title={s.title ?? 'Conversație'}
                      >
                        <p className="line-clamp-2 font-medium leading-tight">
                          {s.title ?? 'Conversație nouă'}
                        </p>
                      </button>
                      <button
                        onClick={() => deleteSession(s.id)}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex flex-1 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
                {messages.length === 0 && !pendingText && (
                  <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                    Întreabă-mă orice despre regulile de padel, terminologie, tactică sau cum se
                    folosește aplicația. Răspund în română și pot cita sursele.
                  </div>
                )}
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} sources={[]} />
                ))}
                {pendingText && (
                  <MessageBubble
                    message={{
                      id: 'pending',
                      role: 'ASSISTANT',
                      content: pendingText,
                      contextChunkIds: null,
                      createdAt: new Date().toISOString(),
                    }}
                    sources={pendingSources}
                    streaming
                  />
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border p-2">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder="Întreabă ceva… (Enter pentru trimitere, Shift+Enter pentru linie nouă)"
                    rows={2}
                    disabled={streaming}
                    className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button onClick={send} disabled={streaming || !input.trim()} size="sm">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({
  message,
  sources,
  streaming,
}: {
  message: SessionMessage;
  sources: Source[];
  streaming?: boolean;
}) {
  const isUser = message.role === 'USER';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
          isUser ? 'bg-brand-700 text-white' : 'bg-muted text-foreground',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-snug">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none [&>*]:my-1 [&_p]:leading-snug [&_ul]:my-1 [&_ol]:my-1">
            <ReactMarkdown>{message.content || (streaming ? '…' : '')}</ReactMarkdown>
          </div>
        )}
        {!isUser && sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 border-t border-border/60 pt-1.5 text-[10px] text-muted-foreground">
            <span className="font-semibold">Surse:</span>
            {sources.map((s) => (
              <span
                key={s.id}
                className="rounded bg-brand-100 px-1.5 py-0.5 text-brand-900"
                title={`Similaritate ${(s.similarity * 100).toFixed(0)}%`}
              >
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
