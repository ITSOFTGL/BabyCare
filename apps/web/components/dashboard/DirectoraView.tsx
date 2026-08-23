'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type {
  Child,
  DashboardSummary,
  Guardian,
  Level,
  Payment,
  Room,
  Teacher,
  User,
} from '@kidcare/types';
import {
  PAYMENT_METHODS,
  ROLES,
  ROLE_LABELS,
  TURNS,
  TURN_LABELS,
} from '@kidcare/types';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import {
  accentBadgeFor,
  accentFor,
  currentMonth,
  formatAge,
  formatDate,
  formatMoney,
} from '@/lib/format';
import { DEFAULT_DIRECTORA_TAB, type DirectoraTabId } from '@/lib/nav';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Modal,
  Select,
  SectionTitle,
  Spinner,
  StatCard,
  Textarea,
  cx,
} from '@/components/ui';

type TabId = DirectoraTabId;

/** Estado de catalogos que comparten casi todos los formularios del panel. */
interface Catalog {
  levels: Level[];
  rooms: Room[];
  teachers: Teacher[];
  users: User[];
  payments: Payment[];
}

const EMPTY_CATALOG: Catalog = {
  levels: [],
  rooms: [],
  teachers: [],
  users: [],
  payments: [],
};

export function DirectoraView({
  data,
  onRefresh,
}: {
  data: DashboardSummary;
  onRefresh: () => Promise<void>;
}) {
  // La pestana activa la controla el sidebar via ?tab=, no un estado local:
  // asi el sidebar (desktop y drawer movil) y esta vista nunca se desincronizan.
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as TabId | null) ?? DEFAULT_DIRECTORA_TAB;
  const [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<TabId | null>(null);
  const [guardianChild, setGuardianChild] = useState<Child | null>(null);

  const loadCatalog = useCallback(async () => {
    try {
      setError(null);
      const [levels, rooms, teachers, users, payments] = await Promise.all([
        apiGet<Level[]>('/levels'),
        apiGet<Room[]>('/rooms'),
        apiGet<Teacher[]>('/teachers'),
        apiGet<User[]>('/users'),
        apiGet<Payment[]>('/payments'),
      ]);
      setCatalog({ levels, rooms, teachers, users, payments });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando los datos');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadCatalog(), onRefresh()]);
  }, [loadCatalog, onRefresh]);

  async function afterCreate() {
    setModal(null);
    await refreshAll();
  }

  if (!ready) return <Spinner label="Cargando la guardería…" />;

  const parents = catalog.users.filter((u) => u.role === 'padre');
  const staffUsers = catalog.users.filter(
    (u) => u.role === 'profesora' || u.role === 'auxiliar',
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard emoji="👶" label="Alumnos" value={data.totals.children} />
        <StatCard
          emoji="👩‍🏫"
          label="Profesoras"
          value={data.totals.teachers}
          tone="bg-ink"
        />
        <StatCard
          emoji="🎨"
          label="Salas"
          value={data.totals.rooms}
          tone="bg-secondary"
        />
        <StatCard
          emoji="💳"
          label="Pagos pendientes"
          value={
            catalog.payments.filter((p) => p.status === 'pendiente').length
          }
          tone="bg-primary-dark"
        />
      </section>

      <ErrorText>{error}</ErrorText>

      <section>
        {tab === 'alumnos' && (
          <>
            <SectionTitle
              emoji="👶"
              action={
                <Button size="sm" onClick={() => setModal('alumnos')}>
                  + Nuevo alumno
                </Button>
              }
            >
              Alumnos
            </SectionTitle>
            {data.children.length === 0 ? (
              <EmptyState
                emoji="👶"
                title="Todavía no hay alumnos"
                hint="Crea el primero con el botón de arriba."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.children.map((child) => (
                  <ChildCard
                    key={child.id}
                    child={child}
                    onDeleted={refreshAll}
                    onManageGuardians={() => setGuardianChild(child)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'salas' && (
          <>
            <SectionTitle
              emoji="🎨"
              action={
                <Button size="sm" onClick={() => setModal('salas')}>
                  + Nueva sala
                </Button>
              }
            >
              Salas
            </SectionTitle>
            {catalog.rooms.length === 0 ? (
              <EmptyState emoji="🎨" title="Aún no hay salas creadas" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.rooms.map((room) => (
                  <Card key={room.id} className="flex items-center gap-4">
                    <div
                      className={cx(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl',
                        accentFor(room.id),
                      )}
                    >
                      🎨
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">{room.name}</p>
                      <p className="text-sm text-ink/50">
                        {room.level?.name ?? 'Sin nivel'} ·{' '}
                        {TURN_LABELS[room.turn]}
                      </p>
                    </div>
                    <Badge>{room.capacity} plazas</Badge>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'niveles' && (
          <>
            <SectionTitle
              emoji="📚"
              action={
                <Button size="sm" onClick={() => setModal('niveles')}>
                  + Nuevo nivel
                </Button>
              }
            >
              Niveles educativos
            </SectionTitle>
            {catalog.levels.length === 0 ? (
              <EmptyState emoji="📚" title="Aún no hay niveles creados" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.levels.map((level) => (
                  <Card key={level.id} className="flex items-center gap-4">
                    <div
                      className={cx(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl',
                        accentFor(level.id),
                      )}
                    >
                      📚
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">{level.name}</p>
                      <p className="text-sm text-ink/50">
                        {level.ageMin}–{level.ageMax} años
                      </p>
                    </div>
                    <Badge>{formatMoney(level.monthlyFee)}/mes</Badge>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'profesoras' && (
          <>
            <SectionTitle
              emoji="👩‍🏫"
              action={
                <Button size="sm" onClick={() => setModal('profesoras')}>
                  + Nueva profesora
                </Button>
              }
            >
              Equipo
            </SectionTitle>
            {catalog.teachers.length === 0 ? (
              <EmptyState emoji="👩‍🏫" title="Aún no hay profesoras dadas de alta" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.teachers.map((teacher) => (
                  <Card key={teacher.id}>
                    <p className="font-bold text-ink">{teacher.name}</p>
                    <p className="text-sm text-ink/50">
                      {teacher.specialty ?? 'Sin especialidad'} ·{' '}
                      {TURN_LABELS[teacher.turn]}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={accentBadgeFor(teacher.roomId)}>
                        {teacher.room?.name ?? 'Sin sala'}
                      </Badge>
                      {teacher.userId ? (
                        <Badge tone="bg-primary/10 text-primary-dark">
                          ✅ Con acceso
                        </Badge>
                      ) : (
                        <Badge tone="bg-ink/8 text-ink/50">Sin cuenta</Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'pagos' && (
          <>
            <SectionTitle
              emoji="💳"
              action={
                <Button size="sm" onClick={() => setModal('pagos')}>
                  + Registrar pago
                </Button>
              }
            >
              Pagos
            </SectionTitle>
            {catalog.payments.length === 0 ? (
              <EmptyState emoji="💳" title="Todavía no hay pagos registrados" />
            ) : (
              <div className="space-y-3">
                {catalog.payments.map((payment) => (
                  <Card
                    key={payment.id}
                    className="flex flex-wrap items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">
                        {payment.childName}
                      </p>
                      <p className="text-sm text-ink/50">
                        {payment.months.join(', ')} ·{' '}
                        {formatMoney(payment.amount)}
                      </p>
                    </div>
                    {payment.status === 'pagado' ? (
                      <Badge tone="bg-primary/10 text-primary-dark">
                        ✅ Pagado {formatDate(payment.paidAt)}
                      </Badge>
                    ) : (
                      <>
                        <Badge tone="bg-secondary/30 text-ink">
                          ⏳ Pendiente
                        </Badge>
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={async () => {
                            await apiPatch(`/payments/${payment.id}/pay`, {
                              method: 'efectivo',
                            });
                            await refreshAll();
                          }}
                        >
                          Marcar pagado
                        </Button>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'cuentas' && (
          <>
            <SectionTitle
              emoji="🔑"
              action={
                <Button size="sm" onClick={() => setModal('cuentas')}>
                  + Nueva cuenta
                </Button>
              }
            >
              Cuentas de acceso
            </SectionTitle>
            <div className="space-y-3">
              {catalog.users.map((u) => (
                <Card key={u.id} className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{u.name}</p>
                    <p className="truncate text-sm text-ink/50">{u.email}</p>
                  </div>
                  <Badge tone="bg-secondary/30 text-ink">
                    {ROLE_LABELS[u.role]}
                  </Badge>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      <Modal
        open={modal === 'alumnos'}
        title="Nuevo alumno"
        emoji="👶"
        onClose={() => setModal(null)}
      >
        <ChildForm
          levels={catalog.levels}
          rooms={catalog.rooms}
          parents={parents}
          onDone={afterCreate}
        />
      </Modal>

      <Modal
        open={modal === 'salas'}
        title="Nueva sala"
        emoji="🎨"
        onClose={() => setModal(null)}
      >
        <RoomForm levels={catalog.levels} onDone={afterCreate} />
      </Modal>

      <Modal
        open={modal === 'niveles'}
        title="Nuevo nivel"
        emoji="📚"
        onClose={() => setModal(null)}
      >
        <LevelForm onDone={afterCreate} />
      </Modal>

      <Modal
        open={modal === 'profesoras'}
        title="Nueva profesora"
        emoji="👩‍🏫"
        onClose={() => setModal(null)}
      >
        <TeacherForm
          rooms={catalog.rooms}
          staffUsers={staffUsers}
          onDone={afterCreate}
        />
      </Modal>

      <Modal
        open={modal === 'pagos'}
        title="Registrar pago"
        emoji="💳"
        onClose={() => setModal(null)}
      >
        <PaymentForm students={data.children} onDone={afterCreate} />
      </Modal>

      <Modal
        open={modal === 'cuentas'}
        title="Nueva cuenta de acceso"
        emoji="🔑"
        onClose={() => setModal(null)}
      >
        <UserForm onDone={afterCreate} />
      </Modal>

      <Modal
        open={guardianChild !== null}
        title={guardianChild ? `Tutores de ${guardianChild.name}` : ''}
        emoji="👪"
        onClose={() => setGuardianChild(null)}
      >
        {guardianChild && <GuardiansManager child={guardianChild} />}
      </Modal>
    </div>
  );
}

/* --------------------------------- Tarjetas -------------------------------- */

function ChildCard({
  child,
  onDeleted,
  onManageGuardians,
}: {
  child: Child;
  onDeleted: () => Promise<void>;
  onManageGuardians: () => void;
}) {
  return (
    <Card className="space-y-3">
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
            {formatAge(child.birthDate)} · {child.room?.name ?? 'Sin sala'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>{TURN_LABELS[child.turn]}</Badge>
        {child.level && (
          <Badge tone={accentBadgeFor(child.levelId)}>{child.level.name}</Badge>
        )}
        {child.allergies && (
          <Badge tone="bg-primary/10 text-primary-dark">
            ⚠️ {child.allergies}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-semibold text-ink/60">
          {formatMoney(child.monthlyFee)}/mes
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="soft" onClick={onManageGuardians}>
            👪 Tutores
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={async () => {
              if (!confirm(`¿Dar de baja a ${child.name}?`)) return;
              await apiDelete(`/children/${child.id}`);
              await onDeleted();
            }}
          >
            Dar de baja
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Gestion de tutores de UN alumno: alta, edicion y borrado individuales
 * (ya no se reemplaza la lista entera en cada guardado, como era antes).
 */
function GuardiansManager({ child }: { child: Child }) {
  const [tutors, setTutors] = useState<Guardian[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const full = await apiGet<Child & { guardians: Guardian[] }>(
        `/children/${child.id}`,
      );
      setTutors(full.guardians);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar');
    }
  }, [child.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function removeTutor(id: string) {
    if (!confirm('¿Quitar este tutor?')) return;
    setBusyId(id);
    try {
      await apiDelete(`/guardians/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar');
    } finally {
      setBusyId(null);
    }
  }

  async function saveTutor(id: string, f: FormData) {
    setBusyId(id);
    try {
      await apiPatch(`/guardians/${id}`, {
        name: f.get('name'),
        phone: f.get('phone') || null,
        email: f.get('email') || null,
        isPrimary: f.get('isPrimary') === 'on',
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusyId(null);
    }
  }

  if (!tutors) return <Spinner label="Cargando tutores…" />;

  return (
    <div className="space-y-4">
      <ErrorText>{error}</ErrorText>

      {tutors.length === 0 ? (
        <p className="text-sm text-ink/45">Este alumno todavía no tiene tutores.</p>
      ) : (
        <div className="space-y-2">
          {tutors.map((tutor) =>
            editingId === tutor.id ? (
              <form
                key={tutor.id}
                className="space-y-2 rounded-2xl bg-background p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveTutor(tutor.id, new FormData(e.currentTarget));
                }}
              >
                <Input name="name" defaultValue={tutor.name} required placeholder="Nombre" />
                <div className="grid grid-cols-2 gap-2">
                  <Input name="phone" defaultValue={tutor.phone ?? ''} placeholder="Teléfono" />
                  <Input name="email" type="email" defaultValue={tutor.email ?? ''} placeholder="Email" />
                </div>
                <label className="flex items-center gap-2 text-sm text-ink/70">
                  <input
                    type="checkbox"
                    name="isPrimary"
                    defaultChecked={tutor.isPrimary}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  Contacto principal
                </label>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={busyId === tutor.id}>
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div
                key={tutor.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-background p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {tutor.name}
                    {tutor.isPrimary && (
                      <Badge tone="bg-secondary/30 text-ink">
                        <span className="ml-1">principal</span>
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink/50">
                    {[tutor.phone, tutor.email].filter(Boolean).join(' · ') || 'Sin contacto'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(tutor.id)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busyId === tutor.id}
                    onClick={() => removeTutor(tutor.id)}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      <AddGuardianForm childId={child.id} onAdded={load} />
    </div>
  );
}

function AddGuardianForm({
  childId,
  onAdded,
}: {
  childId: string;
  onAdded: () => Promise<void>;
}) {
  const { error, busy, submit } = useFormSubmit(onAdded);

  return (
    <form
      className="space-y-2 border-t border-secondary/25 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        void submit(async () => {
          await apiPost(`/children/${childId}/guardians`, {
            name: f.get('name'),
            phone: f.get('phone') || null,
            email: f.get('email') || null,
            isPrimary: f.get('isPrimary') === 'on',
          });
          form.reset();
        });
      }}
    >
      <p className="text-sm font-semibold text-ink/70">+ Añadir tutor</p>
      <Input name="name" required placeholder="Nombre completo" />
      <div className="grid grid-cols-2 gap-2">
        <Input name="phone" placeholder="Teléfono" />
        <Input name="email" type="email" placeholder="Email" />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input type="checkbox" name="isPrimary" className="h-4 w-4 rounded accent-primary" />
        Contacto principal
      </label>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" size="sm" loading={busy}>
        Añadir
      </Button>
    </form>
  );
}

/* -------------------------------- Formularios ------------------------------ */

/** Envoltorio comun: gestiona estado de envio y muestra el error del backend. */
function useFormSubmit(onDone: () => Promise<void>) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  return { error, busy, submit };
}

function LevelForm({ onDone }: { onDone: () => Promise<void> }) {
  const { error, busy, submit } = useFormSubmit(onDone);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void submit(() =>
          apiPost('/levels', {
            name: f.get('name'),
            ageMin: f.get('ageMin'),
            ageMax: f.get('ageMax'),
            monthlyFee: f.get('monthlyFee'),
          }),
        );
      }}
    >
      <Field label="Nombre del nivel">
        <Input name="name" required placeholder="Lactantes" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Edad mínima (años)">
          <Input name="ageMin" type="number" min={0} max={12} defaultValue={0} />
        </Field>
        <Field label="Edad máxima (años)">
          <Input name="ageMax" type="number" min={0} max={12} defaultValue={1} />
        </Field>
      </div>
      <Field label="Cuota mensual (€)">
        <Input name="monthlyFee" type="number" min={0} step="0.01" defaultValue={0} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        Crear nivel
      </Button>
    </form>
  );
}

function RoomForm({
  levels,
  onDone,
}: {
  levels: Level[];
  onDone: () => Promise<void>;
}) {
  const { error, busy, submit } = useFormSubmit(onDone);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void submit(() =>
          apiPost('/rooms', {
            name: f.get('name'),
            levelId: f.get('levelId') || null,
            turn: f.get('turn'),
            capacity: f.get('capacity'),
          }),
        );
      }}
    >
      <Field label="Nombre de la sala">
        <Input name="name" required placeholder="Sala Ositos 🧸" />
      </Field>
      <Field label="Nivel">
        <Select name="levelId" defaultValue="">
          <option value="">Sin nivel</option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Turno">
          <Select name="turn" defaultValue="manana">
            {TURNS.map((t) => (
              <option key={t} value={t}>
                {TURN_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Capacidad">
          <Input name="capacity" type="number" min={0} defaultValue={15} />
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        Crear sala
      </Button>
    </form>
  );
}

function ChildForm({
  levels,
  rooms,
  parents,
  onDone,
}: {
  levels: Level[];
  rooms: Room[];
  parents: User[];
  onDone: () => Promise<void>;
}) {
  const { error, busy, submit } = useFormSubmit(onDone);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const pickup = String(f.get('authorizedPickup') ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const fee = String(f.get('monthlyFee') ?? '').trim();

        void submit(() =>
          apiPost('/children', {
            name: f.get('name'),
            birthDate: f.get('birthDate'),
            levelId: f.get('levelId') || null,
            roomId: f.get('roomId') || null,
            turn: f.get('turn'),
            authorizedPickup: pickup,
            allergies: f.get('allergies') || null,
            medications: f.get('medications') || null,
            observations: f.get('observations') || null,
            parentId: f.get('parentId') || null,
            monthlyFee: fee === '' ? null : fee,
          }),
        );
      }}
    >
      <Field label="Nombre y apellidos">
        <Input name="name" required placeholder="Lucía Fernández" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fecha de nacimiento">
          <Input name="birthDate" type="date" required />
        </Field>
        <Field label="Turno">
          <Select name="turn" defaultValue="manana">
            {TURNS.map((t) => (
              <option key={t} value={t}>
                {TURN_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nivel">
          <Select name="levelId" defaultValue="">
            <option value="">Sin nivel</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sala">
          <Select name="roomId" defaultValue="">
            <option value="">Sin sala</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label="Apoderado / padre"
        hint="Debe tener una cuenta con rol Padre creada en la pestaña Cuentas."
      >
        <Select name="parentId" defaultValue="">
          <option value="">Sin asignar</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.email}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Personas autorizadas a recoger"
        hint="Separadas por comas."
      >
        <Input name="authorizedPickup" placeholder="Abuela Rosa, Tío Marc" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Alergias">
          <Input name="allergies" placeholder="Frutos secos" />
        </Field>
        <Field label="Medicación">
          <Input name="medications" placeholder="Ninguna" />
        </Field>
      </div>
      <Field label="Observaciones médicas">
        <Textarea name="observations" placeholder="Notas relevantes…" />
      </Field>
      <Field label="Cuota mensual (€)" hint="Déjalo vacío para usar la del nivel.">
        <Input name="monthlyFee" type="number" min={0} step="0.01" />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        Crear alumno
      </Button>
    </form>
  );
}

function TeacherForm({
  rooms,
  staffUsers,
  onDone,
}: {
  rooms: Room[];
  staffUsers: User[];
  onDone: () => Promise<void>;
}) {
  const { error, busy, submit } = useFormSubmit(onDone);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void submit(() =>
          apiPost('/teachers', {
            userId: f.get('userId') || null,
            name: f.get('name'),
            specialty: f.get('specialty') || null,
            roomId: f.get('roomId') || null,
            turn: f.get('turn'),
            phone: f.get('phone') || null,
            email: f.get('email') || null,
          }),
        );
      }}
    >
      <Field label="Nombre y apellidos">
        <Input name="name" required placeholder="Marta López" />
      </Field>
      <Field
        label="Cuenta de acceso"
        hint="Vincula la ficha con un usuario para que vea los alumnos de su sala."
      >
        <Select name="userId" defaultValue="">
          <option value="">Sin cuenta</option>
          {staffUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {ROLE_LABELS[u.role]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sala asignada">
          <Select name="roomId" defaultValue="">
            <option value="">Sin sala</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Turno">
          <Select name="turn" defaultValue="manana">
            {TURNS.map((t) => (
              <option key={t} value={t}>
                {TURN_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Especialidad">
        <Input name="specialty" placeholder="Educación infantil" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Teléfono">
          <Input name="phone" placeholder="+34 600 000 000" />
        </Field>
        <Field label="Email de contacto">
          <Input name="email" type="email" placeholder="marta@guarderia.test" />
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        Crear profesora
      </Button>
    </form>
  );
}

function PaymentForm({
  students,
  onDone,
}: {
  students: Child[];
  onDone: () => Promise<void>;
}) {
  const { error, busy, submit } = useFormSubmit(onDone);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const months = String(f.get('months') ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        void submit(() =>
          apiPost('/payments', {
            childId: f.get('childId'),
            amount: f.get('amount'),
            months,
            status: f.get('status'),
            method: f.get('method') || null,
            observation: f.get('observation') || null,
          }),
        );
      }}
    >
      <Field label="Alumno">
        <Select name="childId" required defaultValue="">
          <option value="" disabled>
            Elige un alumno
          </option>
          {students.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Importe (€)">
          <Input name="amount" type="number" min={0} step="0.01" required />
        </Field>
        <Field label="Meses" hint="Formato AAAA-MM, separados por comas.">
          <Input name="months" required defaultValue={currentMonth()} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Estado">
          <Select name="status" defaultValue="pendiente">
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
          </Select>
        </Field>
        <Field label="Método">
          <Select name="method" defaultValue="">
            <option value="">Sin especificar</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Observación">
        <Input name="observation" placeholder="Incluye comedor" />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        Registrar pago
      </Button>
    </form>
  );
}

function UserForm({ onDone }: { onDone: () => Promise<void> }) {
  const { error, busy, submit } = useFormSubmit(onDone);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void submit(() =>
          apiPost('/users', {
            name: f.get('name'),
            email: f.get('email'),
            password: f.get('password'),
            role: f.get('role'),
            phone: f.get('phone') || null,
          }),
        );
      }}
    >
      <Field label="Nombre y apellidos">
        <Input name="name" required placeholder="Marta López" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required placeholder="marta@guarderia.test" />
      </Field>
      <Field label="Contraseña" hint="Mínimo 8 caracteres.">
        <Input name="password" type="password" minLength={8} required />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Rol">
          <Select name="role" defaultValue="profesora">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Teléfono">
          <Input name="phone" placeholder="+34 600 000 000" />
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        Crear cuenta
      </Button>
    </form>
  );
}
