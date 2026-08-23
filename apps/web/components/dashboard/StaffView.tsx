'use client';

import { useState } from 'react';
import type { Child, DashboardSummary } from '@kidcare/types';
import {
  ACTIVITY_EMOJI,
  ACTIVITY_LABELS,
  ACTIVITY_TYPES,
  TURN_LABELS,
} from '@kidcare/types';
import { apiPost } from '@/lib/api';
import { accentFor, formatAge, formatDateTime } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorText,
  Field,
  Modal,
  SectionTitle,
  Select,
  StatCard,
  Textarea,
  cx,
} from '@/components/ui';

/**
 * Vista de profesora / auxiliar: solo los alumnos de su sala y el formulario
 * para ir anotando la agenda diaria.
 */
export function StaffView({
  data,
  onRefresh,
}: {
  data: DashboardSummary;
  onRefresh: () => Promise<void>;
}) {
  const [target, setTarget] = useState<Child | null>(null);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard emoji="👶" label="Mis alumnos" value={data.totals.children} />
        <StatCard
          emoji="📝"
          label="Anotaciones hoy"
          value={data.totals.activitiesToday}
          tone="bg-accent-green"
        />
        <StatCard
          emoji="🔔"
          label="Sin leer"
          value={data.unreadNotifications}
          tone="bg-accent-purple"
        />
      </section>

      <section>
        <SectionTitle emoji="👶">Mi sala</SectionTitle>
        {data.children.length === 0 ? (
          <EmptyState
            emoji="🎨"
            title="No tienes alumnos asignados"
            hint="La dirección debe vincular tu cuenta a una sala desde la ficha de profesora."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.children.map((child) => (
              <Card key={child.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cx(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl',
                      accentFor(child.roomId ?? child.id),
                    )}
                  >
                    👶
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{child.name}</p>
                    <p className="text-sm text-ink/50">
                      {formatAge(child.birthDate)} · {TURN_LABELS[child.turn]}
                    </p>
                  </div>
                </div>

                {(child.allergies || child.medications) && (
                  <div className="flex flex-wrap gap-2">
                    {child.allergies && (
                      <Badge tone="bg-accent-pink/20 text-accent-pink">
                        ⚠️ {child.allergies}
                      </Badge>
                    )}
                    {child.medications && (
                      <Badge tone="bg-accent-blue/20 text-ink">
                        💊 {child.medications}
                      </Badge>
                    )}
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setTarget(child)}
                >
                  📝 Anotar en la agenda
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle emoji="🕒">Últimas anotaciones</SectionTitle>
        {data.recentActivities.length === 0 ? (
          <EmptyState emoji="📝" title="Todavía no hay anotaciones" />
        ) : (
          <div className="space-y-2">
            {data.recentActivities.map((activity) => (
              <Card key={activity.id} className="flex items-center gap-3 py-3">
                <span className="text-2xl">{ACTIVITY_EMOJI[activity.type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {activity.childName} · {ACTIVITY_LABELS[activity.type]}
                  </p>
                  <p className="truncate text-sm text-ink/50">
                    {activity.description || 'Sin detalle'}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink/40">
                  {formatDateTime(activity.recordedAt)}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={target !== null}
        title={target ? `Agenda de ${target.name}` : ''}
        emoji="📝"
        onClose={() => setTarget(null)}
      >
        {target && (
          <ActivityForm
            child={target}
            onDone={async () => {
              setTarget(null);
              await onRefresh();
            }}
          />
        )}
      </Modal>
    </div>
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    setBusy(true);
    try {
      await apiPost('/activities', {
        childId: child.id,
        type: f.get('type'),
        description: f.get('description') || null,
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
        <Select name="type" defaultValue="comida">
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_EMOJI[t]} {ACTIVITY_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Detalle" hint="Lo verá el apoderado en su panel.">
        <Textarea
          name="description"
          placeholder="Comió todo el puré y repitió 🍽️"
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        Guardar anotación
      </Button>
    </form>
  );
}
