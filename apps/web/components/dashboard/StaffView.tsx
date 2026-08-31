'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Child, DailyActivity, DashboardSummary } from '@kidcare/types';
import {
  ACTIVITY_EMOJI,
  ACTIVITY_LABELS,
  ACTIVITY_TYPES,
  CHARGE_KIND_LABELS,
  CHARGE_KINDS,
  TURN_LABELS,
} from '@kidcare/types';
import { apiGet, apiPost } from '@/lib/api';
import {
  accentFor,
  dayBoundsLocal,
  formatAge,
  formatDateTime,
  todayLocalInputValue,
} from '@/lib/format';
import { Icon, type IconName } from '@/components/icons';
import { ChatView } from '@/components/dashboard/ChatView';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Modal,
  SectionTitle,
  Select,
  Spinner,
  StatCard,
  Textarea,
} from '@/components/ui';

const ACTIVITY_ICON: Record<(typeof ACTIVITY_TYPES)[number], IconName> = {
  biberon: 'bottle',
  comida: 'food',
  merienda: 'food',
  almuerzo: 'food',
  siesta: 'sleep',
  panal: 'diaper',
  observacion: 'note',
};

export function StaffView({
  data,
  onRefresh,
}: {
  data: DashboardSummary;
  onRefresh: () => Promise<void>;
}) {
  const [target, setTarget] = useState<Child | null>(null);
  const [agendaRefreshToken, setAgendaRefreshToken] = useState(0);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon="child" label="Mis alumnos" value={data.totals.children} />
        <StatCard
          icon="note"
          label="Anotaciones hoy"
          value={data.totals.activitiesToday}
          tone="gold"
        />
        <StatCard
          icon="bell"
          label="Sin leer"
          value={data.unreadNotifications}
          tone="ink"
        />
      </section>

      <section>
        <SectionTitle icon="child" hint="Toca una ficha para anotar el día">
          Mi sala
        </SectionTitle>
        {data.children.length === 0 ? (
          <EmptyState
            icon="room"
            title="No tienes alumnos asignados"
            hint="La dirección debe asignarte una sala desde Equipo."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.children.map((child) => (
              <Card key={child.id} className="space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar
                    name={child.name}
                    size="lg"
                    tone={accentFor(child.roomId ?? child.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-semibold text-ink">
                      {child.name}
                    </p>
                    <p className="text-sm text-ink-mute">
                      {formatAge(child.birthDate)} · {TURN_LABELS[child.turn]}
                    </p>
                  </div>
                </div>

                {(child.allergies || child.medications) && (
                  <div className="flex flex-wrap gap-2">
                    {child.allergies && <Badge tone="alert">{child.allergies}</Badge>}
                    {child.medications && <Badge tone="gold">{child.medications}</Badge>}
                  </div>
                )}

                <Button size="sm" className="w-full" icon="note" onClick={() => setTarget(child)}>
                  Anotar en la agenda
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <DailyAgendaSection refreshSignal={agendaRefreshToken} />

      <section>
        <SectionTitle icon="announce" hint="Chat de tu sala. Los papás solo ven desde que se unen.">
          Chat de la sala
        </SectionTitle>
        <ChatView hint="Sala" />
      </section>

      <Modal
        open={target !== null}
        title={target ? `Agenda de ${target.name}` : ''}
        icon="note"
        onClose={() => setTarget(null)}
      >
        {target && (
          <ActivityForm
            child={target}
            onDone={async () => {
              setTarget(null);
              setAgendaRefreshToken((n) => n + 1);
              await onRefresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function DailyAgendaSection({ refreshSignal }: { refreshSignal: number }) {
  const [date, setDate] = useState(todayLocalInputValue());
  const [activities, setActivities] = useState<DailyActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setActivities(null);
      const { from, to } = dayBoundsLocal(date);
      const rows = await apiGet<DailyActivity[]>(
        `/activities?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setActivities(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la agenda');
    }
  }, [date, refreshSignal]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section>
      <SectionTitle
        icon="calendar"
        action={
          <Input
            type="date"
            value={date}
            max={todayLocalInputValue()}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        }
      >
        Agenda del día
      </SectionTitle>

      <ErrorText>{error}</ErrorText>

      {!activities ? (
        <Spinner label="Cargando agenda…" />
      ) : activities.length === 0 ? (
        <EmptyState icon="note" title="No hay anotaciones ese día" />
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <Card key={activity.id} className="flex items-center gap-3 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon name={ACTIVITY_ICON[activity.type]} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">
                  {activity.childName} · {ACTIVITY_LABELS[activity.type]}
                </p>
                <p className="truncate text-sm text-ink-mute">
                  {activity.description || 'Sin detalle'}
                </p>
              </div>
              <span className="shrink-0 text-xs text-ink-mute">
                {formatDateTime(activity.recordedAt)}
              </span>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function ActivityForm({
  child,
  onDone,
}: {
  child: Child;
  onDone: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<(typeof ACTIVITY_TYPES)[number]>('comida');
  const [addCharge, setAddCharge] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    setBusy(true);
    const extraAmount = Number(f.get('extraAmount') ?? 0);
    try {
      await apiPost('/activities', {
        childId: child.id,
        type: f.get('type'),
        description: f.get('description') || null,
        extra:
          addCharge && extraAmount > 0
            ? {
                kind: f.get('extraKind'),
                amount: extraAmount,
                description: f.get('extraNote') || null,
              }
            : null,
      });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Field label="Tipo de registro">
        <Select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as (typeof ACTIVITY_TYPES)[number])}
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_EMOJI[t]} {ACTIVITY_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Detalle" hint="Lo verá el apoderado en su panel.">
        <Textarea name="description" placeholder="Comió todo el puré y repitió" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={addCharge}
          onChange={(e) => setAddCharge(e.target.checked)}
          className="h-4 w-4 rounded accent-primary"
        />
        {type === 'panal'
          ? 'Se compró el pañal aquí (cargo extra)'
          : 'Añadir un cargo extra (pañal, leche u otro)'}
      </label>
      {addCharge && (
        <div className="space-y-3 rounded-2xl bg-canvas p-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Qué se cobró">
              <Select name="extraKind" defaultValue={type === 'panal' ? 'panal' : 'otro'}>
                {CHARGE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {CHARGE_KIND_LABELS[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Importe (Bs)">
              <Input name="extraAmount" type="number" min={0} step="1" required defaultValue={10} />
            </Field>
          </div>
          <Input name="extraNote" placeholder="Ej. pañal extra, leche de fórmula" />
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        Guardar anotación
      </Button>
    </form>
  );
}
