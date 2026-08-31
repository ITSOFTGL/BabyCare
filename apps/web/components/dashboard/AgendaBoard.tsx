'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DailyActivity, Room } from '@kidcare/types';
import { ACTIVITY_LABELS, TURN_LABELS } from '@kidcare/types';
import { apiGet } from '@/lib/api';
import { dayBoundsLocal, formatDateTime, todayLocalInputValue } from '@/lib/format';
import { Icon, type IconName } from '@/components/icons';
import { Card, EmptyState, Input, SectionTitle, Spinner } from '@/components/ui';

const ICONS: Record<string, IconName> = {
  biberon: 'bottle',
  comida: 'food',
  merienda: 'food',
  almuerzo: 'food',
  siesta: 'sleep',
  panal: 'diaper',
  observacion: 'note',
};

export function AgendaBoard() {
  const [date, setDate] = useState(todayLocalInputValue());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rows, setRows] = useState<DailyActivity[] | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    const { from, to } = dayBoundsLocal(date);
    const [roomList, activities] = await Promise.all([
      apiGet<Room[]>('/rooms'),
      apiGet<DailyActivity[]>(
        `/activities?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=200`,
      ),
    ]);
    setRooms(roomList);
    setRows(activities);
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, DailyActivity[]>();
    for (const a of rows ?? []) {
      const key = a.roomName ?? 'Sin sala';
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return map;
  }, [rows]);

  return (
    <section>
      <SectionTitle
        icon="calendar"
        hint="Todo lo que el equipo anotó, por sala y hora"
        action={
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        }
      >
        Agenda por sala
      </SectionTitle>
      {!rows ? (
        <Spinner label="Cargando agenda…" />
      ) : rows.length === 0 ? (
        <EmptyState icon="note" title="Ese día no hay anotaciones" />
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([room, list]) => {
            const meta = rooms.find((r) => r.name === room);
            return (
              <div key={room}>
                <h3 className="mb-3 font-display text-lg font-semibold text-ink">
                  {room}
                  {meta && (
                    <span className="ml-2 text-sm font-medium text-ink-mute">
                      {TURN_LABELS[meta.turn]}
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {list.map((a) => (
                    <Card key={a.id} className="flex items-start gap-3 py-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon name={ICONS[a.type] ?? 'note'} size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">
                          {a.childName} · {ACTIVITY_LABELS[a.type]}
                        </p>
                        <p className="text-sm text-ink-mute">{a.description || 'Sin detalle'}</p>
                        <p className="mt-1 text-xs text-ink-mute">
                          {formatDateTime(a.recordedAt)}
                          {a.recordedByName ? ` · Profe ${a.recordedByName}` : ''}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
