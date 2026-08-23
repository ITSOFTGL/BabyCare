'use client';

import { useEffect, useRef, useState } from 'react';
import type { Notification, NotificationType } from '@kidcare/types';
import { apiGet, apiPatch } from '@/lib/api';
import { cx } from '@/components/ui';

const TYPE_EMOJI: Record<NotificationType, string> = {
  info: '💡',
  pago: '💳',
  agenda: '📝',
  alerta: '⚠️',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

/**
 * Campana de notificaciones in-app (v1: solo tabla, sin push). La API ya
 * calculaba el contador de no leidas para el dashboard; aqui se le da un
 * lugar real donde verlas y marcarlas como leidas.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items?.filter((n) => !n.read).length ?? 0;

  async function load() {
    try {
      setItems(await apiGet<Notification[]>('/notifications'));
    } catch {
      // Silencioso: la campana no debe romper el resto del panel.
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function markRead(id: string) {
    setItems((prev) =>
      prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? prev,
    );
    try {
      await apiPatch(`/notifications/${id}/read`);
    } catch {
      void load();
    }
  }

  async function markAllRead() {
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
    try {
      await apiPatch('/notifications/read-all');
    } catch {
      void load();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-lg text-ink/60 transition hover:bg-secondary/25 hover:text-ink"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1 text-[10px] font-bold text-white shadow-sm">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm animate-pop overflow-y-auto rounded-card bg-white p-2 shadow-soft sm:w-96">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="font-bold text-ink">🔔 Notificaciones</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-semibold text-primary-dark hover:underline"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {!items ? (
            <p className="px-3 py-6 text-center text-sm text-ink/40">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink/40">
              No tienes notificaciones todavía.
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => !n.read && markRead(n.id)}
                    className={cx(
                      'flex w-full items-start gap-3 rounded-2xl border-l-4 px-3 py-2.5 text-left transition',
                      n.read
                        ? 'border-transparent hover:bg-background'
                        : 'border-primary bg-secondary/15 hover:bg-secondary/25',
                    )}
                  >
                    <span className="text-xl leading-none">
                      {TYPE_EMOJI[n.type]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {n.title}
                      </span>
                      <span className="block truncate text-xs text-ink/55">
                        {n.message}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-ink/35">
                      {timeAgo(n.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
