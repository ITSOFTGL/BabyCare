'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Chat, ChatMessage } from '@kidcare/types';
import { apiGet, apiPost } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Button, Card, EmptyState, ErrorText, Spinner, Textarea } from '@/components/ui';

export function ChatView({ hint }: { hint?: string }) {
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setChats(await apiGet<Chat[]>('/chats'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los chats');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!active) return;
    let stop = false;
    async function pull() {
      try {
        const rows = await apiGet<ChatMessage[]>(`/chats/${active}/messages`);
        if (!stop) setMessages(rows);
      } catch {
        /* silencio */
      }
    }
    void pull();
    const id = setInterval(pull, 8000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [active]);

  async function send() {
    if (!active || !text.trim()) return;
    setBusy(true);
    try {
      const created = await apiPost<ChatMessage>(`/chats/${active}/messages`, {
        body: text.trim(),
      });
      setMessages((prev) => [...prev, created]);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar');
    } finally {
      setBusy(false);
    }
  }

  if (!chats) return <Spinner label="Cargando conversaciones…" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">
          {hint ?? 'Conversaciones'}
        </p>
        {chats.length === 0 ? (
          <EmptyState icon="announce" title="Aún no hay chats" />
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => setActive(chat.id)}
              className={`w-full rounded-2xl px-3 py-2.5 text-left text-sm font-semibold ${
                active === chat.id ? 'bg-primary text-white' : 'bg-surface text-ink hover:bg-gold-light'
              }`}
            >
              {chat.title}
              <span className="mt-0.5 block text-[11px] font-medium opacity-70">
                {chat.kind === 'sala' ? 'Sala' : 'Comunicado'}
              </span>
            </button>
          ))
        )}
      </div>
      <Card className="flex min-h-[360px] flex-col">
        <ErrorText>{error}</ErrorText>
        {!active ? (
          <p className="m-auto text-sm text-ink-mute">Elige una conversación.</p>
        ) : (
          <>
            <div className="mb-3 max-h-72 flex-1 space-y-2 overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className="rounded-2xl bg-canvas px-3 py-2">
                  <p className="text-[11px] font-semibold text-ink-mute">
                    {m.authorName ?? 'Alguien'} · {formatDateTime(m.createdAt)}
                  </p>
                  <p className="text-sm text-ink">{m.body}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe una respuesta…"
                className="min-h-[48px]"
              />
              <Button onClick={() => void send()} loading={busy} className="self-end">
                Enviar
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
