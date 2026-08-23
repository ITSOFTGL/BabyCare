'use client';

import type { DashboardSummary } from '@kidcare/types';
import {
  ACTIVITY_EMOJI,
  ACTIVITY_LABELS,
  TURN_LABELS,
} from '@kidcare/types';
import {
  accentFor,
  formatAge,
  formatDate,
  formatDateTime,
  formatMoney,
} from '@/lib/format';
import {
  Badge,
  Card,
  EmptyState,
  SectionTitle,
  StatCard,
  cx,
} from '@/components/ui';

/** Vista de apoderado: solo lectura de la agenda y los pagos de sus hijos. */
export function ParentView({ data }: { data: DashboardSummary }) {
  const pending = data.payments.filter((p) => p.status === 'pendiente');

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard emoji="👶" label="Mis hijos" value={data.totals.children} />
        <StatCard
          emoji="📝"
          label="Anotaciones hoy"
          value={data.totals.activitiesToday}
          tone="bg-accent-green"
        />
        <StatCard
          emoji="💳"
          label="Cuotas pendientes"
          value={pending.length}
          tone="bg-accent-pink"
        />
      </section>

      {data.children.length === 0 ? (
        <EmptyState
          emoji="👶"
          title="Aún no hay ninguna ficha vinculada a tu cuenta"
          hint="Pide a la dirección que asocie a tu hijo/a con este email."
        />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {data.children.map((child) => (
            <Card key={child.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <div
                  className={cx(
                    'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl',
                    accentFor(child.roomId ?? child.id),
                  )}
                >
                  👶
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-ink">
                    {child.name}
                  </p>
                  <p className="text-sm text-ink/50">
                    {formatAge(child.birthDate)} ·{' '}
                    {child.room?.name ?? 'Sin sala'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{TURN_LABELS[child.turn]}</Badge>
                {child.level && (
                  <Badge tone="bg-accent-blue/20 text-ink">
                    {child.level.name}
                  </Badge>
                )}
                {child.allergies && (
                  <Badge tone="bg-accent-pink/20 text-accent-pink">
                    ⚠️ {child.allergies}
                  </Badge>
                )}
              </div>
              {child.authorizedPickup.length > 0 && (
                <p className="text-sm text-ink/50">
                  🤝 Pueden recoger: {child.authorizedPickup.join(', ')}
                </p>
              )}
            </Card>
          ))}
        </section>
      )}

      <section>
        <SectionTitle emoji="🕒">Cómo ha ido el día</SectionTitle>
        {data.recentActivities.length === 0 ? (
          <EmptyState
            emoji="📝"
            title="Todavía no hay anotaciones"
            hint="Cuando la profesora registre algo aparecerá aquí."
          />
        ) : (
          <div className="space-y-2">
            {data.recentActivities.map((activity) => (
              <Card key={activity.id} className="flex items-start gap-3 py-4">
                <span className="text-2xl leading-none">
                  {ACTIVITY_EMOJI[activity.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {ACTIVITY_LABELS[activity.type]}
                    <span className="ml-2 text-sm font-medium text-ink/45">
                      {activity.childName}
                    </span>
                  </p>
                  <p className="text-sm text-ink/60">
                    {activity.description || 'Sin detalle'}
                  </p>
                  <p className="mt-1 text-xs text-ink/40">
                    {formatDateTime(activity.recordedAt)}
                    {activity.recordedByName && ` · ${activity.recordedByName}`}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle emoji="💳">Pagos</SectionTitle>
        {data.payments.length === 0 ? (
          <EmptyState emoji="💳" title="No hay cuotas registradas" />
        ) : (
          <div className="space-y-2">
            {data.payments.map((payment) => (
              <Card
                key={payment.id}
                className="flex flex-wrap items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">
                    {formatMoney(payment.amount)}
                  </p>
                  <p className="text-sm text-ink/50">
                    {payment.childName} · {payment.months.join(', ')}
                  </p>
                </div>
                {payment.status === 'pagado' ? (
                  <Badge tone="bg-accent-green/25 text-ink">
                    ✅ Pagado {formatDate(payment.paidAt)}
                  </Badge>
                ) : (
                  <Badge tone="bg-accent-pink/20 text-accent-pink">
                    ⏳ Pendiente
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
