'use client';

import { useEffect, useState } from 'react';
import type { DashboardSummary, ExtraCharge, Payment } from '@kidcare/types';
import {
  ACTIVITY_LABELS,
  ACTIVITY_TYPES,
  CHARGE_KIND_LABELS,
  PAYMENT_STATUS_LABELS,
  TURN_LABELS,
  type ChargeKind,
} from '@kidcare/types';
import { apiGet, apiUpload } from '@/lib/api';
import {
  accentBadgeFor,
  accentFor,
  formatAge,
  formatDate,
  formatDateTime,
  formatMoney,
} from '@/lib/format';
import { InvoiceButton } from '@/components/InvoiceButton';
import { ChatView } from '@/components/dashboard/ChatView';
import { QrImage } from '@/components/QrImage';
import { Icon, type IconName } from '@/components/icons';
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
  StatCard,
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

export function ParentView({
  data,
  onRefresh,
}: {
  data: DashboardSummary;
  onRefresh?: () => Promise<void>;
}) {
  const pending = data.payments.filter((p) => p.status === 'pendiente');
  const [paying, setPaying] = useState<Payment | null>(null);
  const [charges, setCharges] = useState<ExtraCharge[]>([]);

  useEffect(() => {
    void apiGet<ExtraCharge[]>('/charges')
      .then(setCharges)
      .catch(() => setCharges([]));
  }, [data.payments.length]);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon="heart" label="Mis hijos" value={data.totals.children} />
        <StatCard
          icon="note"
          label="Anotaciones hoy"
          value={data.totals.activitiesToday}
          tone="gold"
        />
        <StatCard
          icon="payment"
          label="Cuotas pendientes"
          value={pending.length}
          tone="ink"
        />
      </section>

      {data.children.length === 0 ? (
        <EmptyState
          icon="child"
          title="Aún no hay ninguna ficha vinculada a tu cuenta"
          hint="Pide a la dirección que asocie a tu hijo/a con este email."
        />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {data.children.map((child) => (
            <Card key={child.id} className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar
                  name={child.name}
                  size="lg"
                  tone={accentFor(child.roomId ?? child.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-semibold text-ink">
                    {child.name}
                  </p>
                  <p className="text-sm text-ink-mute">
                    {formatAge(child.birthDate)} · {child.room?.name ?? 'Sin sala'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{TURN_LABELS[child.turn]}</Badge>
                {child.level && (
                  <Badge tone={accentBadgeFor(child.levelId)}>{child.level.name}</Badge>
                )}
                {child.allergies && <Badge tone="alert">{child.allergies}</Badge>}
              </div>
              {child.authorizedPickup.length > 0 && (
                <p className="text-sm text-ink-mute">
                  Pueden recoger: {child.authorizedPickup.join(', ')}
                </p>
              )}
            </Card>
          ))}
        </section>
      )}

      <section>
        <SectionTitle icon="sun" hint="Lo que el equipo anotó hoy">
          Cómo ha ido el día
        </SectionTitle>
        {data.recentActivities.length === 0 ? (
          <EmptyState
            icon="note"
            title="Todavía no hay anotaciones"
            hint="Cuando la profesora registre algo aparecerá aquí."
          />
        ) : (
          <div className="space-y-2">
            {data.recentActivities.map((activity) => (
              <Card key={activity.id} className="flex items-start gap-3 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon name={ACTIVITY_ICON[activity.type]} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {ACTIVITY_LABELS[activity.type]}
                    <span className="ml-2 text-sm font-medium text-ink-mute">
                      {activity.childName}
                    </span>
                  </p>
                  <p className="text-sm text-ink-soft">
                    {activity.description || 'Sin detalle'}
                  </p>
                  <p className="mt-1 text-xs text-ink-mute">
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
        <SectionTitle icon="payment">Pagos</SectionTitle>
        {data.payments.length === 0 ? (
          <EmptyState icon="payment" title="No hay cuotas registradas" />
        ) : (
          <div className="space-y-2">
            {data.payments.map((payment) => (
              <Card key={payment.id} className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-ink">
                    {formatMoney(payment.amount)}
                  </p>
                  <p className="text-sm text-ink-mute">
                    {payment.childName} · {payment.months.join(', ')}
                    {payment.dueDate ? ` · vence ${payment.dueDate}` : ''}
                  </p>
                </div>
                {payment.status === 'pagado' ? (
                  <>
                    <Badge tone="sage">Pagado {formatDate(payment.paidAt)}</Badge>
                    <InvoiceButton
                      paymentId={payment.id}
                      invoiceNumber={payment.invoiceNumber}
                    />
                  </>
                ) : payment.status === 'en_revision' ? (
                  <Badge tone="gold">En revisión</Badge>
                ) : (
                  <>
                    <Badge tone="gold">{PAYMENT_STATUS_LABELS[payment.status]}</Badge>
                    <Button size="sm" onClick={() => setPaying(payment)}>
                      Pagar
                    </Button>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {charges.length > 0 && (
        <section>
          <SectionTitle icon="payment" hint="Pañales, leche u otros que se cobraron aparte">
            Cargos extra
          </SectionTitle>
          <div className="space-y-2">
            {charges.map((charge) => (
              <Card key={charge.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">
                    {(charge.kind in CHARGE_KIND_LABELS
                      ? CHARGE_KIND_LABELS[charge.kind as ChargeKind]
                      : charge.kind)}{' '}
                    · {charge.childName}
                  </p>
                  <p className="text-xs text-ink-mute">{charge.description || 'Sin detalle'}</p>
                </div>
                <span className="font-semibold text-primary">{formatMoney(charge.amount)}</span>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle icon="announce" hint="Responde los comunicados y el chat de tu sala">
          Mensajes
        </SectionTitle>
        <ChatView />
      </section>

      <Modal
        open={paying !== null}
        title={paying ? `Pagar ${formatMoney(paying.amount)}` : ''}
        icon="payment"
        onClose={() => setPaying(null)}
      >
        {paying && (
          <PayWithQr
            payment={paying}
            onDone={async () => {
              setPaying(null);
              await onRefresh?.();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function PayWithQr({
  payment,
  onDone,
}: {
  payment: Payment;
  onDone: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = (e.currentTarget.elements.namedItem('proof') as HTMLInputElement)?.files?.[0];
    if (!file) {
      setError('Adjunta el comprobante del pago para que dirección lo verifique.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('method', 'qr');
      form.append('proof', file);
      await apiUpload(`/payments/${payment.id}/proof`, form);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <p className="text-sm text-ink-soft">
        Escanea el QR de la guardería, realiza el pago y adjunta el comprobante. Dirección
        confirmará la mensualidad.
      </p>
      <QrImage />
      <Field label="Comprobante" hint="Foto o PDF del pago realizado.">
        <Input name="proof" type="file" accept="image/*,.pdf" required />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        Enviar pago
      </Button>
    </form>
  );
}
