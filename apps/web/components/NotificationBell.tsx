'use client';

import { useEffect, useRef, useState } from 'react';
import type { Notification, NotificationType } from '@kidcare/types';
import { apiGet, apiPatch, apiPost, whatsappLink } from '@/lib/api';
import {
  disablePush,
  enablePush,
  getPushStatus,
  type PushStatus,
} from '@/lib/push';
import { Icon, type IconName } from '@/components/icons';
import { cx } from '@/components/ui';

const TYPE_ICON: Record<NotificationType, IconName> = {
  info: 'spark',
  pago: 'payment',
  agenda: 'note',
  alerta: 'alert',
  comunicado: 'announce',
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

function asData(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object') return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    out[k] = String(v);
  }
  return out;
}

function dueMessage(childName: string, dueDate: string, lastDay: boolean) {
  if (lastDay) {
    return `Estimada familia: les recordamos que hoy vence la mensualidad de ${childName}. Pueden realizar el pago en efectivo o por QR desde su panel. Un saludo cordial.`;
  }
  return `Estimada familia: les recordamos que la mensualidad de ${childName} vence el ${dueDate}. Pueden pagar en efectivo o por QR. Un saludo cordial.`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});
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
    void getPushStatus().then(setPushStatus);
  }, []);

  async function togglePush() {
    setPushError(null);
    setPushBusy(true);
    try {
      if (pushStatus === 'subscribed') await disablePush();
      else await enablePush();
      setPushStatus(await getPushStatus());
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'No se pudo activar');
    } finally {
      setPushBusy(false);
    }
  }

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

  async function remind(paymentId: string, notificationId: string) {
    try {
      await apiPost(`/payments/${paymentId}/remind`, {});
      setSent((prev) => ({ ...prev, [notificationId]: true }));
    } catch {
      /* silencio */
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-ink-soft transition hover:bg-gold-light hover:text-ink"
      >
        <Icon name="bell" size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1 text-[10px] font-bold text-white shadow-sm">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm animate-pop overflow-y-auto rounded-card bg-surface p-2 shadow-pop ring-1 ring-ink/[0.06] sm:w-96">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="font-display font-semibold text-ink">Avisos</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {!items ? (
            <p className="px-3 py-6 text-center text-sm text-ink-mute">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-mute">
              No tienes avisos todavía.
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((n) => {
                const data = asData(n.data);
                const isDue = data?.kind === 'vencimiento' && data.paymentId;
                const wa = isDue
                  ? whatsappLink(
                      data.phone,
                      dueMessage(
                        data.childName || 'su niño o niña',
                        data.dueDate || 'hoy',
                        n.title.toLowerCase().includes('hoy'),
                      ),
                    )
                  : null;
                return (
                  <li key={n.id}>
                    <div
                      className={cx(
                        'w-full rounded-2xl px-3 py-2.5 text-left transition',
                        n.read ? 'hover:bg-canvas' : 'bg-gold-light/60 hover:bg-gold-light',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => !n.read && markRead(n.id)}
                        className="flex w-full items-start gap-3 text-left"
                      >
                        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-surface text-primary">
                          <Icon name={TYPE_ICON[n.type]} size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {n.title}
                          </span>
                          <span className="block text-xs text-ink-mute">{n.message}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-mute">
                          {timeAgo(n.createdAt)}
                        </span>
                      </button>
                      {isDue && (
                        <div className="mt-2 flex flex-wrap gap-2 pl-11">
                          <button
                            type="button"
                            onClick={() => void remind(data.paymentId, n.id)}
                            className="rounded-pill bg-primary px-3 py-1 text-[11px] font-semibold text-white"
                          >
                            {sent[n.id] ? 'Aviso enviado' : 'Enviar aviso al papá'}
                          </button>
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-pill bg-sage px-3 py-1 text-[11px] font-semibold text-ink"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {pushStatus && pushStatus !== 'unsupported' && (
            <div className="mt-1 border-t border-ink/[0.06] px-3 py-2.5">
              <button
                type="button"
                onClick={togglePush}
                disabled={pushBusy || pushStatus === 'denied'}
                className="flex w-full items-center justify-between text-xs font-semibold text-ink-soft hover:text-ink disabled:opacity-50"
              >
                <span>
                  {pushStatus === 'subscribed'
                    ? 'Avisos push activados'
                    : pushStatus === 'denied'
                      ? 'Bloqueaste los permisos de notificación'
                      : 'Activar avisos push'}
                </span>
                {pushStatus !== 'denied' && (
                  <span className="text-primary">
                    {pushBusy
                      ? '…'
                      : pushStatus === 'subscribed'
                        ? 'Desactivar'
                        : 'Activar'}
                  </span>
                )}
              </button>
              {pushError && (
                <p className="mt-1 text-xs text-primary-dark">{pushError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
