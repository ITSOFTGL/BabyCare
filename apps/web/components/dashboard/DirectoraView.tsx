'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type {
  Announcement,
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
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_AUDIENCE_LABELS,
  PAYMENT_METHOD_LABELS,
  ROLES,
  ROLE_LABELS,
  TURNS,
  TURN_LABELS,
  suggestEmail,
} from '@kidcare/types';
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload, downloadFile, whatsappLink } from '@/lib/api';
import {
  accentBadgeFor,
  accentFor,
  currentMonth,
  formatAge,
  formatDate,
  formatMoney,
  toDateInput,
  todayLocalInputValue,
} from '@/lib/format';
import { DEFAULT_DIRECTORA_TAB, type DirectoraTabId } from '@/lib/nav';
import { InvoiceButton } from '@/components/InvoiceButton';
import { AgendaBoard } from '@/components/dashboard/AgendaBoard';
import { ChatView } from '@/components/dashboard/ChatView';
import { QrImage } from '@/components/QrImage';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Modal,
  ProgressBar,
  SearchField,
  Select,
  SectionTitle,
  Spinner,
  StatCard,
  Textarea,
  cx,
} from '@/components/ui';

type TabId = DirectoraTabId;

interface Catalog {
  levels: Level[];
  rooms: Room[];
  teachers: Teacher[];
  users: User[];
  payments: Payment[];
  announcements: Announcement[];
}

const EMPTY_CATALOG: Catalog = {
  levels: [],
  rooms: [],
  teachers: [],
  users: [],
  payments: [],
  announcements: [],
};

async function downloadProof(paymentId: string) {
  await downloadFile(`/payments/${paymentId}/proof-file`, `comprobante-${paymentId}`);
}

function dueWhatsappText(childName: string, dueDate: string, lastDay: boolean) {
  if (lastDay) {
    return `Estimada familia: les recordamos que hoy vence la mensualidad de ${childName}. Pueden realizar el pago en efectivo o por QR desde su panel. Un saludo cordial.`;
  }
  return `Estimada familia: les recordamos que la mensualidad de ${childName} vence el ${dueDate}. Pueden pagar en efectivo o por QR. Un saludo cordial.`;
}

type Editor =
  | { entity: 'alumnos'; item?: Child }
  | { entity: 'salas'; item?: Room }
  | { entity: 'niveles'; item?: Level }
  | { entity: 'profesoras'; item?: Teacher }
  | { entity: 'pagos'; item?: Payment }
  | { entity: 'cuentas'; item?: User }
  | null;

type PendingDelete =
  | { kind: 'child'; id: string; name: string }
  | { kind: 'room'; id: string; name: string }
  | { kind: 'level'; id: string; name: string }
  | { kind: 'teacher'; id: string; name: string }
  | { kind: 'payment'; id: string; name: string }
  | { kind: 'user'; id: string; name: string }
  | null;

function matches(query: string, ...fields: Array<string | null | undefined>) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => (f ?? '').toLowerCase().includes(q));
}

export function DirectoraView({
  data,
  onRefresh,
}: {
  data: DashboardSummary;
  onRefresh: () => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as TabId | null) ?? DEFAULT_DIRECTORA_TAB;
  const [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [guardianChild, setGuardianChild] = useState<Child | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState('');

  const loadCatalog = useCallback(async () => {
    try {
      setError(null);
      const [levels, rooms, teachers, users, payments, announcements] =
        await Promise.all([
          apiGet<Level[]>('/levels'),
          apiGet<Room[]>('/rooms'),
          apiGet<Teacher[]>('/teachers'),
          apiGet<User[]>('/users'),
          apiGet<Payment[]>('/payments'),
          apiGet<Announcement[]>('/announcements'),
        ]);
      setCatalog({ levels, rooms, teachers, users, payments, announcements });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando los datos');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    setQuery('');
  }, [tab]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadCatalog(), onRefresh()]);
  }, [loadCatalog, onRefresh]);

  async function afterSave() {
    setEditor(null);
    await refreshAll();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const { kind, id } = pendingDelete;
      const path =
        kind === 'child'
          ? `/children/${id}`
          : kind === 'room'
            ? `/rooms/${id}`
            : kind === 'level'
              ? `/levels/${id}`
              : kind === 'teacher'
                ? `/teachers/${id}`
                : kind === 'payment'
                  ? `/payments/${id}`
                  : `/users/${id}`;
      await apiDelete(path);
      setPendingDelete(null);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const parents = catalog.users.filter((u) => u.role === 'padre');

  const childrenByRoom = useMemo(() => {
    const map = new Map<string, number>();
    for (const child of data.children) {
      if (!child.roomId) continue;
      map.set(child.roomId, (map.get(child.roomId) ?? 0) + 1);
    }
    return map;
  }, [data.children]);

  if (!ready) return <Spinner label="Cargando la guardería…" />;

  const pendingPayments = catalog.payments.filter((p) => p.status === 'pendiente');
  const paidPayments = catalog.payments.filter((p) => p.status === 'pagado');

  return (
    <div className="space-y-7">
      <ErrorText>{error}</ErrorText>

      {tab === 'inicio' && (
        <Overview
          data={data}
          catalog={catalog}
          childrenByRoom={childrenByRoom}
          pending={pendingPayments}
        />
      )}

      {tab === 'alumnos' && (
        <section>
          <SectionTitle
            icon="child"
            hint={`${data.children.length} fichas · ${data.totals.rooms} salas`}
            action={
              <Button size="sm" icon="plus" onClick={() => setEditor({ entity: 'alumnos' })}>
                Nuevo alumno
              </Button>
            }
          >
            Alumnos
          </SectionTitle>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre, sala o alergia…"
            className="mb-4 max-w-md"
          />
          {data.children.length === 0 ? (
            <EmptyState
              icon="child"
              title="Todavía no hay alumnos"
              hint="Crea el primero para empezar el curso."
              action={
                <Button size="sm" icon="plus" onClick={() => setEditor({ entity: 'alumnos' })}>
                  Nuevo alumno
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.children
                .filter((c) =>
                  matches(query, c.name, c.room?.name, c.level?.name, c.allergies),
                )
                .map((child) => (
                  <ChildCard
                    key={child.id}
                    child={child}
                    onEdit={() => setEditor({ entity: 'alumnos', item: child })}
                    onDelete={() =>
                      setPendingDelete({
                        kind: 'child',
                        id: child.id,
                        name: child.name,
                      })
                    }
                    onManageGuardians={() => setGuardianChild(child)}
                  />
                ))}
            </div>
          )}
        </section>
      )}

      {tab === 'salas' && (
        <section>
          <SectionTitle
            icon="room"
            hint="Capacidad y ocupación por aula"
            action={
              <Button size="sm" icon="plus" onClick={() => setEditor({ entity: 'salas' })}>
                Nueva sala
              </Button>
            }
          >
            Salas
          </SectionTitle>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar sala o nivel…"
            className="mb-4 max-w-md"
          />
          {catalog.rooms.length === 0 ? (
            <EmptyState icon="room" title="Aún no hay salas creadas" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {catalog.rooms
                .filter((r) => matches(query, r.name, r.level?.name))
                .map((room) => {
                  const occupied = childrenByRoom.get(room.id) ?? 0;
                  return (
                    <Card key={room.id} className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={cx(
                            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-ink/70',
                            accentFor(room.id),
                          )}
                        >
                          {room.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-lg font-semibold text-ink">
                            {room.name}
                          </p>
                          <p className="text-sm text-ink-mute">
                            {room.level?.name ?? 'Sin nivel'} · {TURN_LABELS[room.turn]}
                          </p>
                        </div>
                        <Badge>{occupied}/{room.capacity}</Badge>
                      </div>
                      <ProgressBar
                        value={occupied}
                        max={room.capacity || 1}
                        tone={occupied >= room.capacity ? 'primary' : 'sage'}
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          icon="edit"
                          aria-label="Editar sala"
                          onClick={() => setEditor({ entity: 'salas', item: room })}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          icon="trash"
                          aria-label="Eliminar sala"
                          onClick={() =>
                            setPendingDelete({
                              kind: 'room',
                              id: room.id,
                              name: room.name,
                            })
                          }
                        />
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </section>
      )}

      {tab === 'niveles' && (
        <section>
          <SectionTitle
            icon="level"
            action={
              <Button size="sm" icon="plus" onClick={() => setEditor({ entity: 'niveles' })}>
                Nuevo nivel
              </Button>
            }
          >
            Niveles educativos
          </SectionTitle>
          {catalog.levels.length === 0 ? (
            <EmptyState icon="level" title="Aún no hay niveles creados" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {catalog.levels.map((level) => {
                const count = data.children.filter((c) => c.levelId === level.id).length;
                return (
                  <Card key={level.id} className="flex items-center gap-4">
                    <div
                      className={cx(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-semibold text-ink/70',
                        accentFor(level.id),
                      )}
                    >
                      {level.ageMin}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg font-semibold text-ink">
                        {level.name}
                      </p>
                      <p className="text-sm text-ink-mute">
                        {level.ageMin}–{level.ageMax} años · {count} alumnos
                      </p>
                    </div>
                    <Badge tone="sage">{formatMoney(level.monthlyFee)}/mes</Badge>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        icon="edit"
                        aria-label="Editar nivel"
                        onClick={() => setEditor({ entity: 'niveles', item: level })}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        icon="trash"
                        aria-label="Eliminar nivel"
                        onClick={() =>
                          setPendingDelete({
                            kind: 'level',
                            id: level.id,
                            name: level.name,
                          })
                        }
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'profesoras' && (
        <section>
          <SectionTitle
            icon="teacher"
            action={
              <Button size="sm" icon="plus" onClick={() => setEditor({ entity: 'profesoras' })}>
                Nueva profesora
              </Button>
            }
          >
            Equipo
          </SectionTitle>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre o especialidad…"
            className="mb-4 max-w-md"
          />
          {catalog.teachers.length === 0 ? (
            <EmptyState icon="teacher" title="Aún no hay profesoras dadas de alta" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {catalog.teachers
                .filter((t) => matches(query, t.name, t.specialty, t.room?.name))
                .map((teacher) => (
                  <Card key={teacher.id} className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar name={teacher.name} tone={accentFor(teacher.roomId ?? teacher.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg font-semibold text-ink">
                          {teacher.name}
                        </p>
                        <p className="text-sm text-ink-mute">
                          {teacher.specialty ?? 'Sin especialidad'} · {TURN_LABELS[teacher.turn]}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={accentBadgeFor(teacher.roomId)}>
                        {teacher.room?.name ?? 'Sin sala'}
                      </Badge>
                      {teacher.userId ? (
                        <Badge tone="sage">Con acceso</Badge>
                      ) : (
                        <Badge tone="ink">Sin cuenta</Badge>
                      )}
                      <div className="ml-auto flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          icon="edit"
                          aria-label="Editar"
                          onClick={() => setEditor({ entity: 'profesoras', item: teacher })}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          icon="trash"
                          aria-label="Eliminar"
                          onClick={() =>
                            setPendingDelete({
                              kind: 'teacher',
                              id: teacher.id,
                              name: teacher.name,
                            })
                          }
                        />
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </section>
      )}

      {tab === 'pagos' && (
        <section>
          <SectionTitle
            icon="payment"
            hint={`${pendingPayments.length} pendientes · ${paidPayments.length} cobrados`}
            action={
              <Button size="sm" icon="plus" onClick={() => setEditor({ entity: 'pagos' })}>
                Registrar pago
              </Button>
            }
          >
            Pagos
          </SectionTitle>
          <QrSettings />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar alumno o mes…"
            className="mb-4 max-w-md"
          />
          {catalog.payments.length === 0 ? (
            <EmptyState icon="payment" title="Todavía no hay pagos registrados" />
          ) : (
            <div className="space-y-3">
              {catalog.payments
                .filter((p) => matches(query, p.childName, p.months.join(' '), p.invoiceNumber))
                .map((payment) => (
                  <Card
                    key={payment.id}
                    className="flex flex-wrap items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-semibold text-ink">
                        {payment.childName}
                      </p>
                      <p className="text-sm text-ink-mute">
                        {payment.months.join(', ')} · {formatMoney(payment.amount)}
                        {payment.method
                          ? ` · ${PAYMENT_METHOD_LABELS[payment.method]}`
                          : ''}
                        {payment.payerName ? ` · ${payment.payerName}` : ''}
                        {payment.observation ? ` · ${payment.observation}` : ''}
                      </p>
                    </div>
                    {payment.status === 'pagado' ? (
                      <>
                        <Badge tone="sage">
                          Pagado {formatDate(payment.paidAt)}
                          {payment.dueDate ? ` · vence ${payment.dueDate}` : ''}
                        </Badge>
                        <InvoiceButton
                          paymentId={payment.id}
                          invoiceNumber={payment.invoiceNumber ?? 'recibo'}
                        />
                      </>
                    ) : payment.status === 'en_revision' ? (
                      <>
                        <Badge tone="alert">Por verificar</Badge>
                        {payment.proofPath && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void downloadProof(payment.id)
                            }
                          >
                            Comprobante
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="sage"
                          onClick={async () => {
                            await apiPatch(`/payments/${payment.id}/verify`, { accept: true });
                            await refreshAll();
                          }}
                        >
                          Aceptar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge tone="gold">Pendiente</Badge>
                        <Button
                          size="sm"
                          variant="sage"
                          icon="check"
                          onClick={async () => {
                            await apiPatch(`/payments/${payment.id}/pay`, {
                              method: 'efectivo',
                            });
                            await refreshAll();
                          }}
                        >
                          Cobrar
                        </Button>
                      </>
                    )}
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        icon="edit"
                        aria-label="Editar pago"
                        onClick={() => setEditor({ entity: 'pagos', item: payment })}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        icon="trash"
                        aria-label="Eliminar pago"
                        onClick={() =>
                          setPendingDelete({
                            kind: 'payment',
                            id: payment.id,
                            name: `${payment.childName} · ${formatMoney(payment.amount)}`,
                          })
                        }
                      />
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </section>
      )}

      {tab === 'agenda' && <AgendaBoard />}

      {tab === 'reportes' && (
        <Reports data={data} catalog={catalog} childrenByRoom={childrenByRoom} />
      )}

      {tab === 'cuentas' && (
        <section>
          <SectionTitle
            icon="account"
            action={
              <Button size="sm" icon="plus" onClick={() => setEditor({ entity: 'cuentas' })}>
                Nueva cuenta
              </Button>
            }
          >
            Cuentas de acceso
          </SectionTitle>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre o email…"
            className="mb-4 max-w-md"
          />
          <div className="space-y-3">
            {catalog.users
              .filter((u) => matches(query, u.name, u.email, ROLE_LABELS[u.role]))
              .map((u) => (
                <Card key={u.id} className="flex flex-wrap items-center gap-3">
                  <Avatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold text-ink">{u.name}</p>
                    <p className="truncate text-sm text-ink-mute">{u.email}</p>
                  </div>
                  <Badge>{ROLE_LABELS[u.role]}</Badge>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      icon="edit"
                      aria-label="Editar cuenta"
                      onClick={() => setEditor({ entity: 'cuentas', item: u })}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      icon="trash"
                      aria-label="Eliminar cuenta"
                      onClick={() =>
                        setPendingDelete({ kind: 'user', id: u.id, name: u.name })
                      }
                    />
                  </div>
                </Card>
              ))}
          </div>
        </section>
      )}

      {tab === 'comunicados' && (
        <section>
          <SectionTitle icon="announce" hint="Solo tú envías. Las familias responden en el chat de cada aviso o sala.">
            Comunicados
          </SectionTitle>
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <AnnouncementForm
                rooms={catalog.rooms}
                children={data.children}
                onDone={refreshAll}
              />
            </Card>
            <div>
              <h3 className="mb-3 font-display text-lg font-semibold text-ink">
                Enviados ({catalog.announcements.length})
              </h3>
              {catalog.announcements.length === 0 ? (
                <EmptyState
                  icon="announce"
                  title="Todavía no se ha enviado ningún comunicado"
                />
              ) : (
                <div className="space-y-2">
                  {catalog.announcements.map((a) => (
                    <Card key={a.id}>
                      <p className="font-display font-semibold text-ink">{a.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">{a.message}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge>{ANNOUNCEMENT_AUDIENCE_LABELS[a.audience]}</Badge>
                        <Badge tone="ink">{a.recipientCount} destinatarios</Badge>
                        <span className="text-xs text-ink-mute">
                          {formatDate(a.createdAt)}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-8">
            <h3 className="mb-3 font-display text-lg font-semibold text-ink">Chats</h3>
            <ChatView hint="Salas y comunicados" />
          </div>
        </section>
      )}

      <Modal
        open={editor?.entity === 'alumnos'}
        title={editor?.entity === 'alumnos' && editor.item ? 'Editar alumno' : 'Nuevo alumno'}
        icon="child"
        onClose={() => setEditor(null)}
      >
        {editor?.entity === 'alumnos' && (
          <ChildForm
            levels={catalog.levels}
            rooms={catalog.rooms}
            parents={parents}
            initial={editor.item}
            onDone={afterSave}
          />
        )}
      </Modal>

      <Modal
        open={editor?.entity === 'salas'}
        title={editor?.entity === 'salas' && editor.item ? 'Editar sala' : 'Nueva sala'}
        icon="room"
        onClose={() => setEditor(null)}
      >
        {editor?.entity === 'salas' && (
          <RoomForm
            levels={catalog.levels}
            initial={editor.item}
            onDone={afterSave}
          />
        )}
      </Modal>

      <Modal
        open={editor?.entity === 'niveles'}
        title={editor?.entity === 'niveles' && editor.item ? 'Editar nivel' : 'Nuevo nivel'}
        icon="level"
        onClose={() => setEditor(null)}
      >
        {editor?.entity === 'niveles' && (
          <LevelForm initial={editor.item} onDone={afterSave} />
        )}
      </Modal>

      <Modal
        open={editor?.entity === 'profesoras'}
        title={
          editor?.entity === 'profesoras' && editor.item
            ? 'Editar profesora'
            : 'Nueva profesora'
        }
        icon="teacher"
        onClose={() => setEditor(null)}
      >
        {editor?.entity === 'profesoras' && (
          <TeacherForm
            rooms={catalog.rooms}
            initial={editor.item}
            onDone={afterSave}
          />
        )}
      </Modal>

      <Modal
        open={editor?.entity === 'pagos'}
        title={editor?.entity === 'pagos' && editor.item ? 'Editar pago' : 'Registrar pago'}
        icon="payment"
        onClose={() => setEditor(null)}
      >
        {editor?.entity === 'pagos' && (
          <PaymentForm
            students={data.children}
            initial={editor.item}
            onDone={afterSave}
          />
        )}
      </Modal>

      <Modal
        open={editor?.entity === 'cuentas'}
        title={editor?.entity === 'cuentas' && editor.item ? 'Editar cuenta' : 'Nueva cuenta'}
        icon="account"
        onClose={() => setEditor(null)}
      >
        {editor?.entity === 'cuentas' && (
          <UserForm initial={editor.item} onDone={afterSave} />
        )}
      </Modal>

      <Modal
        open={guardianChild !== null}
        title={guardianChild ? `Tutores de ${guardianChild.name}` : ''}
        icon="users"
        onClose={() => setGuardianChild(null)}
      >
        {guardianChild && <GuardiansManager child={guardianChild} />}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Confirmar baja"
        message={
          pendingDelete
            ? `Vas a eliminar ${pendingDelete.name}. Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

/* -------------------------------- Overview -------------------------------- */

function Overview({
  data,
  catalog,
  childrenByRoom,
  pending,
}: {
  data: DashboardSummary;
  catalog: Catalog;
  childrenByRoom: Map<string, number>;
  pending: Payment[];
}) {
  return (
    <div className="space-y-7">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="child" label="Alumnos" value={data.totals.children} hint="Fichas activas" />
        <StatCard
          icon="teacher"
          label="Equipo"
          value={data.totals.teachers}
          tone="sage"
        />
        <StatCard
          icon="room"
          label="Salas"
          value={data.totals.rooms}
          tone="gold"
        />
        <StatCard
          icon="payment"
          label="Pagos pendientes"
          value={pending.length}
          tone="ink"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-ink">Ocupación</h3>
            <Link
              href="/dashboard?tab=salas"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver salas
            </Link>
          </div>
          {catalog.rooms.length === 0 ? (
            <p className="text-sm text-ink-mute">Crea una sala para ver la ocupación.</p>
          ) : (
            <div className="space-y-4">
              {catalog.rooms.map((room) => {
                const n = childrenByRoom.get(room.id) ?? 0;
                return (
                  <div key={room.id}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-semibold text-ink">{room.name}</span>
                      <span className="text-ink-mute">
                        {n} / {room.capacity}
                      </span>
                    </div>
                    <ProgressBar value={n} max={room.capacity || 1} tone="sage" />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-semibold text-ink">
            Cuotas al día
          </h3>
          {pending.length === 0 ? (
            <p className="text-sm text-ink-mute">No hay cuotas pendientes. Bien.</p>
          ) : (
            <ul className="space-y-3">
              {pending.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{p.childName}</p>
                    <p className="text-xs text-ink-mute">{p.months.join(', ')}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-primary">
                    {formatMoney(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/dashboard?tab=pagos"
            className="mt-4 inline-block text-xs font-semibold text-primary hover:underline"
          >
            Ir a pagos
          </Link>
        </Card>
      </div>

      <DuesPanel />
    </div>
  );
}

/* -------------------------------- Reports --------------------------------- */

function Reports({
  data,
  catalog,
  childrenByRoom,
}: {
  data: DashboardSummary;
  catalog: Catalog;
  childrenByRoom: Map<string, number>;
}) {
  const paid = catalog.payments.filter((p) => p.status === 'pagado');
  const pending = catalog.payments.filter((p) => p.status === 'pendiente');
  const paidSum = paid.reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingSum = pending.reduce((s, p) => s + Number(p.amount || 0), 0);
  const thisMonth = currentMonth();
  const monthPaid = paid.filter((p) => p.months.includes(thisMonth));
  const occupied = data.children.filter((c) => c.roomId).length;
  const capacity = catalog.rooms.reduce((s, r) => s + r.capacity, 0);

  const byLevel = catalog.levels.map((level) => ({
    level,
    count: data.children.filter((c) => c.levelId === level.id).length,
  }));

  return (
    <section className="space-y-6">
      <SectionTitle icon="report" hint="Resumen operativo y económico de la casa">
        Reportes
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="payment" label="Cobrado" value={formatMoney(paidSum)} hint={`${paid.length} recibos`} />
        <StatCard
          icon="clock"
          label="Pendiente"
          value={formatMoney(pendingSum)}
          tone="gold"
          hint={`${pending.length} cuotas`}
        />
        <StatCard
          icon="child"
          label="Ocupación"
          value={capacity ? `${Math.round((occupied / capacity) * 100)}%` : '—'}
          tone="sage"
          hint={`${occupied} de ${capacity} plazas`}
        />
        <StatCard
          icon="calendar"
          label={`Cobros ${thisMonth}`}
          value={monthPaid.length}
          tone="ink"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display text-lg font-semibold text-ink">
            Alumnos por nivel
          </h3>
          {byLevel.length === 0 ? (
            <p className="text-sm text-ink-mute">Sin niveles.</p>
          ) : (
            <div className="space-y-4">
              {byLevel.map(({ level, count }) => (
                <div key={level.id}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold text-ink">{level.name}</span>
                    <span className="text-ink-mute">{count}</span>
                  </div>
                  <ProgressBar
                    value={count}
                    max={Math.max(data.children.length, 1)}
                    tone="primary"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-lg font-semibold text-ink">
            Ocupación por sala
          </h3>
          <div className="space-y-4">
            {catalog.rooms.map((room) => {
              const n = childrenByRoom.get(room.id) ?? 0;
              return (
                <div key={room.id}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold text-ink">{room.name}</span>
                    <span className="text-ink-mute">
                      {n}/{room.capacity} · {room.capacity ? Math.round((n / room.capacity) * 100) : 0}%
                    </span>
                  </div>
                  <ProgressBar value={n} max={room.capacity || 1} tone="sage" />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 font-display text-lg font-semibold text-ink">
          Estado de tesorería
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-ink-soft">Cobrado</span>
              <span className="font-semibold">{formatMoney(paidSum)}</span>
            </div>
            <ProgressBar value={paidSum} max={paidSum + pendingSum || 1} tone="sage" />
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-ink-soft">Pendiente</span>
              <span className="font-semibold">{formatMoney(pendingSum)}</span>
            </div>
            <ProgressBar value={pendingSum} max={paidSum + pendingSum || 1} tone="gold" />
          </div>
        </div>
      </Card>
    </section>
  );
}

/* --------------------------------- Tarjetas -------------------------------- */

function ChildCard({
  child,
  onEdit,
  onDelete,
  onManageGuardians,
}: {
  child: Child;
  onEdit: () => void;
  onDelete: () => void;
  onManageGuardians: () => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <Avatar name={child.name} size="lg" tone={accentFor(child.roomId ?? child.id)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold text-ink">
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/[0.05] pt-3">
        <span className="text-sm font-semibold text-ink-soft">
          {formatMoney(child.monthlyFee)}/mes
        </span>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="soft" icon="users" onClick={onManageGuardians}>
            Tutores
          </Button>
          <Button size="icon" variant="ghost" icon="edit" aria-label="Editar" onClick={onEdit} />
          <Button size="icon" variant="ghost" icon="trash" aria-label="Dar de baja" onClick={onDelete} />
        </div>
      </div>
    </Card>
  );
}

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
        ci: f.get('ci') || null,
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
        <p className="text-sm text-ink-mute">Este alumno todavía no tiene tutores.</p>
      ) : (
        <div className="space-y-2">
          {tutors.map((tutor) =>
            editingId === tutor.id ? (
              <form
                key={tutor.id}
                className="space-y-2 rounded-2xl bg-canvas p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveTutor(tutor.id, new FormData(e.currentTarget));
                }}
              >
                <Input name="name" defaultValue={tutor.name} required placeholder="Nombre" />
                <div className="grid grid-cols-2 gap-2">
                  <Input name="phone" defaultValue={tutor.phone ?? ''} placeholder="Teléfono / WhatsApp" />
                  <Input name="ci" defaultValue={tutor.ci ?? ''} placeholder="CI" />
                </div>
                <Input name="email" type="email" defaultValue={tutor.email ?? ''} placeholder="Email" />
                <label className="flex items-center gap-2 text-sm text-ink-soft">
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
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div
                key={tutor.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-canvas p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {tutor.name}
                    {tutor.isPrimary && (
                      <Badge tone="gold">
                        <span className="ml-1">principal</span>
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-mute">
                    {[tutor.ci && `CI ${tutor.ci}`, tutor.phone, tutor.email]
                      .filter(Boolean)
                      .join(' · ') || 'Sin contacto'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" icon="edit" onClick={() => setEditingId(tutor.id)} />
                  <Button
                    size="icon"
                    variant="ghost"
                    icon="trash"
                    loading={busyId === tutor.id}
                    onClick={() => removeTutor(tutor.id)}
                  />
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
      className="space-y-2 border-t border-ink/[0.06] pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        void submit(async () => {
          await apiPost(`/children/${childId}/guardians`, {
            name: f.get('name'),
            phone: f.get('phone') || null,
            email: f.get('email') || null,
            ci: f.get('ci') || null,
            isPrimary: f.get('isPrimary') === 'on',
          });
          form.reset();
        });
      }}
    >
      <p className="text-sm font-semibold text-ink-soft">Añadir tutor</p>
      <Input name="name" required placeholder="Nombre completo" />
      <div className="grid grid-cols-2 gap-2">
        <Input name="phone" placeholder="Teléfono / WhatsApp" />
        <Input name="ci" placeholder="CI" />
      </div>
      <Input name="email" type="email" placeholder="Email" />
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="isPrimary" className="h-4 w-4 rounded accent-primary" />
        Contacto principal
      </label>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" size="sm" icon="plus" loading={busy}>
        Añadir
      </Button>
    </form>
  );
}

type DueItem = {
  childId: string;
  childName: string;
  dueDate: string;
  daysLeft: number;
  parentPhone: string | null;
  paymentId: string;
  amount: string;
  overdue: boolean;
};

function DuesPanel() {
  const [items, setItems] = useState<DueItem[] | null>(null);

  useEffect(() => {
    void apiGet<DueItem[]>('/payments/dues')
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <Card>
      <h3 className="mb-3 font-display text-lg font-semibold text-ink">
        Vencimientos próximos
      </h3>
      <ul className="space-y-3">
        {items.map((item) => {
          const wa = whatsappLink(
            item.parentPhone,
            dueWhatsappText(item.childName, item.dueDate, item.overdue),
          );
          return (
            <li
              key={item.paymentId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-canvas px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{item.childName}</p>
                <p className="text-xs text-ink-mute">
                  {item.overdue ? 'Vence hoy' : `En ${item.daysLeft} días`} · {item.dueDate} ·{' '}
                  {formatMoney(item.amount)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void apiPost(`/payments/${item.paymentId}/remind`, {})}
                >
                  Avisar papá
                </Button>
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-pill bg-sage px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function QrSettings() {
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void apiGet<{ expiresAt: string | null }>('/settings/qr-meta')
      .then((m) => setExpiresAt(m.expiresAt))
      .catch(() => setExpiresAt(null));
  }, [tick]);

  return (
    <Card className="mb-4 flex flex-wrap items-center gap-4">
      <div className="w-40">
        <QrImage key={tick} className="h-36 w-36 rounded-2xl bg-canvas object-contain p-2" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-display font-semibold text-ink">QR de cobro (1 año)</p>
        <p className="text-sm text-ink-mute">
          {expiresAt
            ? `Válido hasta ${expiresAt}. Compártelo con las familias o súbelo del banco.`
            : 'Hay un QR de demostración. Sube el de tu cuenta bancaria.'}
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setError(null);
              try {
                const form = new FormData();
                form.append('file', file);
                const meta = await apiUpload<{ expiresAt: string }>('/settings/qr', form);
                setExpiresAt(meta.expiresAt);
                setTick((n) => n + 1);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'No se pudo subir');
              } finally {
                setBusy(false);
              }
            }}
          />
          {busy ? 'Subiendo…' : 'Subir QR del banco'}
        </label>
        <ErrorText>{error}</ErrorText>
      </div>
    </Card>
  );
}

/* -------------------------------- Formularios ------------------------------ */

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

function LevelForm({
  initial,
  onDone,
}: {
  initial?: Level;
  onDone: () => Promise<void>;
}) {
  const { error, busy, submit } = useFormSubmit(onDone);
  const editing = Boolean(initial);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const payload = {
          name: f.get('name'),
          ageMin: f.get('ageMin'),
          ageMax: f.get('ageMax'),
          monthlyFee: f.get('monthlyFee'),
        };
        void submit(() =>
          editing
            ? apiPatch(`/levels/${initial!.id}`, payload)
            : apiPost('/levels', payload),
        );
      }}
    >
      <Field label="Nombre del nivel">
        <Input name="name" required placeholder="Lactantes" defaultValue={initial?.name} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Edad mínima (años)">
          <Input name="ageMin" type="number" min={0} max={12} defaultValue={initial?.ageMin ?? 0} />
        </Field>
        <Field label="Edad máxima (años)">
          <Input name="ageMax" type="number" min={0} max={12} defaultValue={initial?.ageMax ?? 1} />
        </Field>
      </div>
      <Field label="Cuota mensual (Bs)" hint="Ej. 350, 300, 250.">
        <Input
          name="monthlyFee"
          type="number"
          min={0}
          step="0.01"
          defaultValue={initial?.monthlyFee ?? 0}
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        {editing ? 'Guardar cambios' : 'Crear nivel'}
      </Button>
    </form>
  );
}

function RoomForm({
  levels,
  initial,
  onDone,
}: {
  levels: Level[];
  initial?: Room;
  onDone: () => Promise<void>;
}) {
  const { error, busy, submit } = useFormSubmit(onDone);
  const editing = Boolean(initial);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const payload = {
          name: f.get('name'),
          levelId: f.get('levelId') || null,
          turn: f.get('turn'),
          capacity: f.get('capacity'),
        };
        void submit(() =>
          editing
            ? apiPatch(`/rooms/${initial!.id}`, payload)
            : apiPost('/rooms', payload),
        );
      }}
    >
      <Field label="Nombre de la sala">
        <Input name="name" required placeholder="Sala Ositos" defaultValue={initial?.name} />
      </Field>
      <Field label="Nivel">
        <Select name="levelId" defaultValue={initial?.levelId ?? ''}>
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
          <Select name="turn" defaultValue={initial?.turn ?? 'manana'}>
            {TURNS.map((t) => (
              <option key={t} value={t}>
                {TURN_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Capacidad">
          <Input name="capacity" type="number" min={0} defaultValue={initial?.capacity ?? 15} />
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        {editing ? 'Guardar cambios' : 'Crear sala'}
      </Button>
    </form>
  );
}

function ChildForm({
  levels,
  rooms,
  parents,
  initial,
  onDone,
}: {
  levels: Level[];
  rooms: Room[];
  parents: User[];
  initial?: Child;
  onDone: () => Promise<void>;
}) {
  const { error, busy, submit } = useFormSubmit(onDone);
  const editing = Boolean(initial);
  const [assignParent, setAssignParent] = useState(!editing);
  const [parentName, setParentName] = useState('');
  const parentEmail = suggestEmail(parentName || 'padre');

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
        const payload: Record<string, unknown> = {
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
        };
        if (!editing && assignParent && f.get('parentName')) {
          payload.parentId = null;
          payload.parentAccount = {
            name: f.get('parentName'),
            password: f.get('parentPassword'),
            email: f.get('parentEmail') || null,
            phone: f.get('parentPhone') || null,
            ci: f.get('parentCi') || null,
          };
        }
        void submit(() =>
          editing
            ? apiPatch(`/children/${initial!.id}`, payload)
            : apiPost('/children', payload),
        );
      }}
    >
      <Field label="Nombre y apellidos">
        <Input name="name" required placeholder="Lucía Fernández" defaultValue={initial?.name} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fecha de nacimiento">
          <Input name="birthDate" type="date" required defaultValue={toDateInput(initial?.birthDate)} />
        </Field>
        <Field label="Turno">
          <Select name="turn" defaultValue={initial?.turn ?? 'manana'}>
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
          <Select name="levelId" defaultValue={initial?.levelId ?? ''}>
            <option value="">Sin nivel</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sala">
          <Select name="roomId" defaultValue={initial?.roomId ?? ''}>
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
        hint={
          editing
            ? 'Puedes cambiar el apoderado si ya tiene cuenta.'
            : 'Si dices que sí, le creamos el acceso ahora. No olvides la contraseña.'
        }
      >
        {!editing && (
          <label className="mb-3 flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={assignParent}
              onChange={(e) => setAssignParent(e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            Asignar apoderado ahora y crear su cuenta
          </label>
        )}
        {assignParent && !editing ? (
          <div className="space-y-3 rounded-2xl bg-canvas p-3">
            <Input
              name="parentName"
              required
              placeholder="Nombre del papá o mamá"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
            />
            <Input name="parentCi" placeholder="Cédula de identidad" />
            <Input name="parentPhone" placeholder="Teléfono / WhatsApp" />
            <Field label="Email de ingreso (se genera solo)">
              <Input name="parentEmail" type="email" defaultValue={parentEmail} key={parentEmail} />
            </Field>
            <Field label="Contraseña" hint="Mínimo 8 caracteres. Anótala para dársela a la familia.">
              <Input name="parentPassword" type="password" minLength={8} required />
            </Field>
          </div>
        ) : (
          <Select name="parentId" defaultValue={initial?.parentId ?? ''}>
            <option value="">Sin asignar / más tarde</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.email}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Personas autorizadas a recoger" hint="Separadas por comas.">
        <Input
          name="authorizedPickup"
          placeholder="Abuela Rosa, Tío Marc"
          defaultValue={initial?.authorizedPickup.join(', ')}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Alergias">
          <Input name="allergies" placeholder="Frutos secos" defaultValue={initial?.allergies ?? ''} />
        </Field>
        <Field label="Medicación">
          <Input name="medications" placeholder="Ninguna" defaultValue={initial?.medications ?? ''} />
        </Field>
      </div>
      <Field label="Observaciones médicas">
        <Textarea name="observations" placeholder="Notas relevantes…" defaultValue={initial?.observations ?? ''} />
      </Field>
      <Field label="Cuota mensual (Bs)" hint="Ej. 300, 350, 250. Vacío usa la del nivel.">
        <Input
          name="monthlyFee"
          type="number"
          min={0}
          step="0.01"
          defaultValue={initial?.monthlyFee ?? ''}
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        {editing ? 'Guardar cambios' : 'Crear alumno'}
      </Button>
    </form>
  );
}

function TeacherForm({
  rooms,
  initial,
  onDone,
}: {
  rooms: Room[];
  initial?: Teacher;
  onDone: () => Promise<void>;
}) {
  const { error, busy, submit } = useFormSubmit(onDone);
  const editing = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? '');
  const email = initial?.email ?? suggestEmail(name || 'profesora');

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const payload = {
          name: f.get('name'),
          specialty: f.get('specialty') || null,
          roomId: f.get('roomId') || null,
          turn: f.get('turn'),
          phone: f.get('phone') || null,
          email: f.get('email') || null,
          password: f.get('password') || undefined,
        };
        void submit(() =>
          editing
            ? apiPatch(`/teachers/${initial!.id}`, payload)
            : apiPost('/teachers', payload),
        );
      }}
    >
      <Field label="Nombre y apellidos">
        <Input
          name="name"
          required
          placeholder="Carla Diaz"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field
        label="Email de ingreso"
        hint="Se arma solo con el nombre. Puedes editarlo. Con esta cuenta entra a su sala."
      >
        <Input name="email" type="email" required defaultValue={email} key={email} />
      </Field>
      <Field
        label={editing ? 'Nueva contraseña' : 'Contraseña'}
        hint="Mínimo 8 caracteres. Entrégasela a la profesora."
      >
        <Input name="password" type="password" minLength={editing ? undefined : 8} required={!editing} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sala asignada">
          <Select name="roomId" defaultValue={initial?.roomId ?? ''}>
            <option value="">Sin sala</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Turno">
          <Select name="turn" defaultValue={initial?.turn ?? 'manana'}>
            {TURNS.map((t) => (
              <option key={t} value={t}>
                {TURN_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Especialidad">
        <Input name="specialty" placeholder="Educación infantil" defaultValue={initial?.specialty ?? ''} />
      </Field>
      <Field label="Teléfono / WhatsApp">
        <Input name="phone" placeholder="70000000" defaultValue={initial?.phone ?? ''} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        {editing ? 'Guardar cambios' : 'Crear profesora y su cuenta'}
      </Button>
    </form>
  );
}

function PaymentForm({
  students,
  initial,
  onDone,
}: {
  students: Child[];
  initial?: Payment;
  onDone: () => Promise<void>;
}) {
  const { error, busy, submit } = useFormSubmit(onDone);
  const editing = Boolean(initial);
  const [childId, setChildId] = useState(initial?.childId ?? '');
  const [method, setMethod] = useState(initial?.method ?? 'efectivo');
  const [payerName, setPayerName] = useState(initial?.payerName ?? '');
  const [payerCi, setPayerCi] = useState(initial?.payerCi ?? '');
  const selected = students.find((c) => c.id === childId);

  useEffect(() => {
    if (!childId || editing) return;
    void apiGet<Child>(`/children/${childId}`)
      .then((c) => {
        const g = c.guardians?.find((x) => x.isPrimary) ?? c.guardians?.[0];
        if (g) {
          setPayerName(g.name);
          setPayerCi(g.ci ?? '');
        }
      })
      .catch(() => undefined);
  }, [childId, editing]);
  const today = todayLocalInputValue();
  const defaultDue = (() => {
    const [y, m, d] = today.split('-').map(Number) as [number, number, number];
    const dt = new Date(y, m, d);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  })();

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
        const payload = {
          childId: f.get('childId') || childId,
          amount: f.get('amount'),
          months,
          status: f.get('status'),
          method: f.get('method') || null,
          observation: f.get('observation') || null,
          payerName: f.get('payerName') || null,
          payerCi: f.get('payerCi') || null,
          periodStart: f.get('periodStart') || null,
          dueDate: f.get('dueDate') || null,
        };
        void submit(() =>
          editing
            ? apiPatch(`/payments/${initial!.id}`, {
                amount: payload.amount,
                months: payload.months,
                status: payload.status,
                method: payload.method,
                observation: payload.observation,
                payerName: payload.payerName,
                payerCi: payload.payerCi,
                periodStart: payload.periodStart,
                dueDate: payload.dueDate,
              })
            : apiPost('/payments', payload),
        );
      }}
    >
      {!editing && (
        <Field label="Alumno">
          <Select
            name="childId"
            required
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
          >
            <option value="" disabled>
              Elige un alumno
            </option>
            {students.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.monthlyFee ? ` · ${formatMoney(c.monthlyFee)}` : ''}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Importe (Bs)" hint="Ej. 300, 350, 250">
          <Input
            name="amount"
            type="number"
            min={0}
            step="1"
            required
            defaultValue={initial?.amount ?? selected?.monthlyFee ?? ''}
            key={selected?.monthlyFee ?? initial?.amount ?? 'amount'}
          />
        </Field>
        <Field label="Mes" hint="AAAA-MM">
          <Input name="months" required defaultValue={initial?.months.join(', ') ?? currentMonth()} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Inicio del periodo">
          <Input
            name="periodStart"
            type="date"
            defaultValue={initial?.periodStart ?? today}
          />
        </Field>
        <Field label="Vence (próxima renovación)" hint="Si paga el 1 de agosto, vence el 1 de septiembre.">
          <Input
            name="dueDate"
            type="date"
            defaultValue={initial?.dueDate ?? defaultDue}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="A nombre de" hint="Apoderado principal. Puedes editarlo.">
          <Input
            name="payerName"
            placeholder="Nombre del apoderado"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
          />
        </Field>
        <Field label="CI">
          <Input
            name="payerCi"
            placeholder="Cédula de identidad"
            value={payerCi}
            onChange={(e) => setPayerCi(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Estado">
          <Select name="status" defaultValue={initial?.status ?? 'pendiente'}>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="en_revision">Por verificar</option>
          </Select>
        </Field>
        <Field label="Método">
          <Select
            name="method"
            value={method ?? 'efectivo'}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="efectivo">{PAYMENT_METHOD_LABELS.efectivo}</option>
            <option value="qr">{PAYMENT_METHOD_LABELS.qr}</option>
          </Select>
        </Field>
      </div>
      {method === 'qr' && (
        <div className="rounded-2xl bg-canvas p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-mute">
            QR de la guardería
          </p>
          <QrImage className="mx-auto h-40 w-40 rounded-2xl object-contain" />
        </div>
      )}
      <Field label="Observación">
        <Input name="observation" placeholder="Incluye comedor" defaultValue={initial?.observation ?? ''} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        {editing ? 'Guardar cambios' : 'Registrar pago'}
      </Button>
    </form>
  );
}

function UserForm({
  initial,
  onDone,
}: {
  initial?: User;
  onDone: () => Promise<void>;
}) {
  const { error, busy, submit } = useFormSubmit(onDone);
  const editing = Boolean(initial);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const password = String(f.get('password') ?? '');
        const payload: Record<string, unknown> = {
          name: f.get('name'),
          email: f.get('email'),
          role: f.get('role'),
          phone: f.get('phone') || null,
        };
        if (password) payload.password = password;
        void submit(() =>
          editing
            ? apiPatch(`/users/${initial!.id}`, payload)
            : apiPost('/users', { ...payload, password }),
        );
      }}
    >
      <Field label="Nombre y apellidos">
        <Input name="name" required placeholder="Marta López" defaultValue={initial?.name} />
      </Field>
      <Field label="Email">
        <Input
          name="email"
          type="email"
          required
          placeholder="marta@guarderia.test"
          defaultValue={initial?.email}
        />
      </Field>
      <Field
        label={editing ? 'Nueva contraseña' : 'Contraseña'}
        hint={editing ? 'Déjala vacía para no cambiarla. Mínimo 8 caracteres.' : 'Mínimo 8 caracteres.'}
      >
        <Input name="password" type="password" minLength={editing ? undefined : 8} required={!editing} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Rol">
          <Select name="role" defaultValue={initial?.role ?? 'profesora'}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Teléfono">
          <Input name="phone" placeholder="+34 600 000 000" defaultValue={initial?.phone ?? ''} />
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full">
        {editing ? 'Guardar cambios' : 'Crear cuenta'}
      </Button>
    </form>
  );
}

function AnnouncementForm({
  rooms,
  children,
  onDone,
}: {
  rooms: Room[];
  children: Child[];
  onDone: () => Promise<void>;
}) {
  const { error, busy, submit } = useFormSubmit(onDone);
  const [audience, setAudience] = useState<'todos' | 'sala' | 'padre'>('todos');

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const base = { title: f.get('title'), message: f.get('message') };
        void submit(async () => {
          if (audience === 'todos') {
            await apiPost('/announcements', { audience, ...base });
          } else if (audience === 'sala') {
            await apiPost('/announcements', {
              audience,
              ...base,
              roomId: f.get('roomId'),
            });
          } else {
            await apiPost('/announcements', {
              audience,
              ...base,
              childId: f.get('childId'),
            });
          }
          form.reset();
        });
      }}
    >
      <Field label="Destinatario">
        <Select
          value={audience}
          onChange={(e) => setAudience(e.target.value as typeof audience)}
        >
          {ANNOUNCEMENT_AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {ANNOUNCEMENT_AUDIENCE_LABELS[a]}
            </option>
          ))}
        </Select>
      </Field>

      {audience === 'sala' && (
        <Field label="Sala">
          <Select name="roomId" required defaultValue="">
            <option value="" disabled>
              Elige una sala
            </option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {audience === 'padre' && (
        <Field label="Alumno">
          <Select name="childId" required defaultValue="">
            <option value="" disabled>
              Elige un alumno
            </option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label="Título">
        <Input name="title" required placeholder="Día de la familia" />
      </Field>
      <Field label="Mensaje">
        <Textarea
          name="message"
          required
          placeholder="Celebración el próximo viernes a las 10:00…"
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} className="w-full" icon="announce">
        Enviar comunicado
      </Button>
    </form>
  );
}
