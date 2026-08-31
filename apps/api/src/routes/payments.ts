import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import {
  and,
  children,
  desc,
  eq,
  extraCharges,
  getDb,
  gte,
  guardians,
  inArray,
  isNull,
  notifications,
  payments,
  users,
} from '@kidcare/db';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '@kidcare/types';
import { env } from '../env.ts';
import { paramId, parseBody, parseQuery, uuidSchema } from '../lib/validate.ts';
import { canAccessChild, getVisibleChildIds } from '../lib/scope.ts';
import { notifyUser } from '../lib/notify.ts';
import {
  generateInvoicePdf,
  nextInvoiceNumber,
  readInvoicePdf,
} from '../lib/invoice.ts';
import { addOneMonth, daysUntil, periodFromPayDay, toDateOnly } from '../lib/period.ts';
import { directorIds } from '../lib/chat.ts';
import {
  requireAuth,
  requireDirectora,
  type AppEnv,
} from '../middleware/auth.ts';

const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Los meses van en formato AAAA-MM');

const createSchema = z.object({
  childId: uuidSchema,
  amount: z.coerce.number().min(0),
  months: z.array(monthSchema).min(1, 'Indica al menos un mes'),
  status: z.enum(PAYMENT_STATUSES).default('pendiente'),
  method: z.enum(PAYMENT_METHODS).optional().nullable(),
  observation: z.string().max(500).optional().nullable(),
  payerName: z.string().optional().nullable(),
  payerCi: z.string().optional().nullable(),
  periodStart: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

const paySchema = z.object({
  method: z.enum(PAYMENT_METHODS).default('efectivo'),
  observation: z.string().max(500).optional().nullable(),
  payerName: z.string().optional().nullable(),
  payerCi: z.string().optional().nullable(),
});

export const paymentRoutes = new Hono<AppEnv>();

paymentRoutes.use('*', requireAuth);

async function primaryGuardian(childId: string) {
  const rows = await getDb()
    .select()
    .from(guardians)
    .where(eq(guardians.childId, childId));
  return rows.find((g) => g.isPrimary) ?? rows[0] ?? null;
}

async function buildInvoice(payment: {
  id: string;
  invoiceNumber: string | null;
  childId: string;
  months: string[];
  amount: string;
  method: string | null;
  paidAt: Date | null;
  payerName: string | null;
  payerCi: string | null;
  periodStart: string | null;
  dueDate: string | null;
}) {
  if (!payment.invoiceNumber || !payment.paidAt) return;
  const [child] = await getDb()
    .select({ name: children.name })
    .from(children)
    .where(eq(children.id, payment.childId))
    .limit(1);
  await generateInvoicePdf({
    paymentId: payment.id,
    invoiceNumber: payment.invoiceNumber,
    tenantName: env.tenantName,
    childName: child?.name ?? 'Alumno',
    months: payment.months,
    amount: payment.amount,
    method: payment.method,
    paidAt: payment.paidAt,
    payerName: payment.payerName,
    payerCi: payment.payerCi,
    periodStart: payment.periodStart,
    dueDate: payment.dueDate,
  });
}

paymentRoutes.get('/', async (c) => {
  const query = parseQuery(
    c,
    z.object({
      childId: uuidSchema.optional(),
      status: z.enum(PAYMENT_STATUSES).optional(),
    }),
  );
  const user = c.get('user');
  const visible = await getVisibleChildIds(user);
  if (visible !== null && visible.length === 0) return c.json([]);

  if (query.childId && !(await canAccessChild(user, query.childId))) {
    throw new HTTPException(403, { message: 'No puedes ver los pagos de este alumno' });
  }

  const filters = [
    query.childId
      ? eq(payments.childId, query.childId)
      : visible !== null
        ? inArray(payments.childId, visible)
        : undefined,
    query.status ? eq(payments.status, query.status) : undefined,
  ].filter(Boolean) as never[];

  const rows = await getDb()
    .select({ payment: payments, childName: children.name })
    .from(payments)
    .innerJoin(children, eq(payments.childId, children.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(payments.createdAt));

  return c.json(rows.map((r) => ({ ...r.payment, childName: r.childName })));
});

paymentRoutes.get('/dues', requireDirectora, async (c) => {
  const db = getDb();
  const rows = await db
    .select({
      payment: payments,
      childName: children.name,
      parentId: children.parentId,
      parentPhone: users.phone,
      parentName: users.name,
    })
    .from(payments)
    .innerJoin(children, eq(payments.childId, children.id))
    .leftJoin(users, eq(children.parentId, users.id));

  const latest = new Map<string, (typeof rows)[number] & { due: string }>();
  for (const row of rows) {
    const due =
      row.payment.dueDate ??
      addOneMonth(toDateOnly(row.payment.paidAt ?? row.payment.createdAt));
    const prev = latest.get(row.payment.childId);
    if (!prev || due > prev.due) latest.set(row.payment.childId, { ...row, due });
  }

  const items = [...latest.values()]
    .map((r) => {
      const days = daysUntil(r.due);
      return {
        childId: r.payment.childId,
        childName: r.childName,
        dueDate: r.due,
        daysLeft: days,
        parentId: r.parentId,
        parentName: r.parentName,
        parentPhone: r.parentPhone,
        paymentId: r.payment.id,
        amount: r.payment.amount,
        status: r.payment.status,
        urgent: days <= 5,
        overdue: days <= 0,
      };
    })
    .filter((r) => r.daysLeft <= 5);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const already = await db
    .select({ userId: notifications.userId, data: notifications.data })
    .from(notifications)
    .where(and(eq(notifications.type, 'alerta'), gte(notifications.createdAt, startOfToday)));

  const directors = await directorIds();
  for (const item of items) {
    if (item.daysLeft !== 5 && item.daysLeft > 0) continue;
    const title = item.overdue
      ? `Hoy vence la mensualidad de ${item.childName}`
      : `En 5 días vence la mensualidad de ${item.childName}`;
    for (const dirId of directors) {
      const sent = already.some((n) => {
        const data = n.data as { kind?: string; paymentId?: string } | null;
        return (
          n.userId === dirId &&
          data?.kind === 'vencimiento' &&
          data.paymentId === item.paymentId
        );
      });
      if (sent) continue;
      await notifyUser({
        userId: dirId,
        title,
        message: `Cuota ${item.amount} Bs · vence ${item.dueDate}. Puedes avisar al papá o enviarle WhatsApp.`,
        type: 'alerta',
        data: {
          kind: 'vencimiento',
          paymentId: item.paymentId,
          childId: item.childId,
          parentId: item.parentId,
          dueDate: item.dueDate,
          phone: item.parentPhone,
          childName: item.childName,
        },
      });
    }
  }

  return c.json(items);
});

paymentRoutes.post('/', requireDirectora, async (c) => {
  const body = await parseBody(c, createSchema);
  const db = getDb();
  const [child] = await db
    .select({ id: children.id, name: children.name, parentId: children.parentId })
    .from(children)
    .where(eq(children.id, body.childId))
    .limit(1);
  if (!child) throw new HTTPException(404, { message: 'Alumno no encontrado' });

  const tutor = await primaryGuardian(child.id);
  const period = periodFromPayDay();
  const periodStart = body.periodStart || period.periodStart;
  const dueDate = body.dueDate || period.dueDate;

  const [created] = await db
    .insert(payments)
    .values({
      childId: body.childId,
      amount: body.amount.toFixed(2),
      months: body.months,
      status: body.status,
      method: body.method ?? null,
      observation: body.observation ?? null,
      paidAt: body.status === 'pagado' ? new Date() : null,
      payerName: body.payerName || tutor?.name || null,
      payerCi: body.payerCi || tutor?.ci || null,
      periodStart,
      dueDate,
    })
    .returning();

  if (body.status === 'pagado') {
    const invoiceNumber = await nextInvoiceNumber();
    await db.update(payments).set({ invoiceNumber }).where(eq(payments.id, created!.id));
    created!.invoiceNumber = invoiceNumber;
    try {
      await buildInvoice({ ...created!, invoiceNumber, paidAt: created!.paidAt });
    } catch (error) {
      console.error('[invoice]', error);
    }
  }

  await notifyUser({
    userId: child.parentId,
    title:
      body.status === 'pagado'
        ? `Pago registrado de ${child.name}`
        : `Nueva cuota pendiente de ${child.name}`,
    message: `${body.months.join(', ')} — ${body.amount.toFixed(2)} Bs`,
    type: 'pago',
    data: { paymentId: created!.id, childId: child.id },
  });

  return c.json({ ...created, childName: child.name }, 201);
});

paymentRoutes.patch('/:id/pay', requireDirectora, async (c) => {
  const id = paramId(c);
  const body = await parseBody(c, paySchema);
  const db = getDb();
  const [current] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  if (!current) throw new HTTPException(404, { message: 'Pago no encontrado' });
  if (current.status === 'pagado') {
    throw new HTTPException(409, { message: 'Ese pago ya estaba cobrado' });
  }

  const paidAt = new Date();
  const period = periodFromPayDay(paidAt);
  const invoiceNumber = await nextInvoiceNumber();
  const tutor = await primaryGuardian(current.childId);

  const [updated] = await db
    .update(payments)
    .set({
      status: 'pagado',
      method: body.method,
      paidAt,
      observation: body.observation ?? current.observation,
      invoiceNumber,
      payerName: body.payerName || current.payerName || tutor?.name || null,
      payerCi: body.payerCi || current.payerCi || tutor?.ci || null,
      periodStart: current.periodStart ?? period.periodStart,
      dueDate: current.dueDate ?? period.dueDate,
    })
    .where(eq(payments.id, id))
    .returning();

  const [child] = await db
    .select({ name: children.name, parentId: children.parentId })
    .from(children)
    .where(eq(children.id, current.childId))
    .limit(1);

  try {
    await buildInvoice(updated!);
  } catch (error) {
    console.error('[invoice]', error);
  }

  await db
    .update(extraCharges)
    .set({ paymentId: id })
    .where(and(eq(extraCharges.childId, current.childId), isNull(extraCharges.paymentId)));

  await notifyUser({
    userId: child?.parentId,
    title: `Pago confirmado de ${child?.name ?? 'tu hijo/a'}`,
    message: `Recibimos ${current.amount} Bs. Vigencia hasta ${updated?.dueDate ?? 'el próximo mes'}.`,
    type: 'pago',
    data: { paymentId: id, invoiceNumber },
  });

  return c.json({ ...updated, childName: child?.name });
});

paymentRoutes.post('/:id/proof', async (c) => {
  const id = paramId(c);
  const user = c.get('user');
  if (user.role !== 'padre' && user.role !== 'directora') {
    throw new HTTPException(403, { message: 'No puedes adjuntar comprobante' });
  }
  const db = getDb();
  const [current] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  if (!current) throw new HTTPException(404, { message: 'Pago no encontrado' });
  if (!(await canAccessChild(user, current.childId)) && user.role !== 'directora') {
    throw new HTTPException(403, { message: 'No puedes pagar esta cuota' });
  }

  const form = await c.req.parseBody();
  const method = String(form.method ?? 'qr');
  const file = form.proof;
  let proofPath: string | null = current.proofPath;
  if (file && typeof file !== 'string') {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const dir = path.join(env.storageDir, 'proofs');
    await fs.mkdir(dir, { recursive: true });
    proofPath = `proofs/${id}.${ext}`;
    await fs.writeFile(path.join(env.storageDir, proofPath), Buffer.from(await file.arrayBuffer()));
  }

  const [updated] = await db
    .update(payments)
    .set({
      status: 'en_revision',
      method: (PAYMENT_METHODS as readonly string[]).includes(method)
        ? (method as (typeof PAYMENT_METHODS)[number])
        : 'qr',
      proofPath,
    })
    .where(eq(payments.id, id))
    .returning();

  const [child] = await db
    .select({ name: children.name })
    .from(children)
    .where(eq(children.id, current.childId))
    .limit(1);

  for (const dirId of await directorIds()) {
    await notifyUser({
      userId: dirId,
      title: `Comprobante de ${child?.name ?? 'un alumno'}`,
      message: `${user.name} adjuntó un pago por ${current.amount} Bs para verificar.`,
      type: 'pago',
      data: { paymentId: id, kind: 'comprobante' },
    });
  }

  return c.json(updated);
});

paymentRoutes.patch('/:id/verify', requireDirectora, async (c) => {
  const id = paramId(c);
  const body = await parseBody(
    c,
    z.object({ accept: z.boolean(), observation: z.string().optional().nullable() }),
  );
  const db = getDb();
  const [current] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  if (!current) throw new HTTPException(404, { message: 'Pago no encontrado' });

  if (!body.accept) {
    const [updated] = await db
      .update(payments)
      .set({ status: 'pendiente', observation: body.observation ?? current.observation })
      .where(eq(payments.id, id))
      .returning();
    const [child] = await db
      .select({ parentId: children.parentId, name: children.name })
      .from(children)
      .where(eq(children.id, current.childId))
      .limit(1);
    await notifyUser({
      userId: child?.parentId,
      title: 'Comprobante no aceptado',
      message: `Revisa el pago de ${child?.name}. ${body.observation ?? ''}`.trim(),
      type: 'pago',
    });
    return c.json(updated);
  }

  c.set('user', c.get('user'));
  const paidAt = new Date();
  const period = periodFromPayDay(paidAt);
  const invoiceNumber = current.invoiceNumber ?? (await nextInvoiceNumber());
  const [updated] = await db
    .update(payments)
    .set({
      status: 'pagado',
      paidAt,
      invoiceNumber,
      periodStart: current.periodStart ?? period.periodStart,
      dueDate: current.dueDate ?? period.dueDate,
    })
    .where(eq(payments.id, id))
    .returning();
  try {
    await buildInvoice(updated!);
  } catch (error) {
    console.error('[invoice]', error);
  }
  const [child] = await db
    .select({ parentId: children.parentId, name: children.name })
    .from(children)
    .where(eq(children.id, current.childId))
    .limit(1);
  await notifyUser({
    userId: child?.parentId,
    title: `Pago verificado de ${child?.name}`,
    message: `Confirmamos ${current.amount} Bs. Recibo ${invoiceNumber}.`,
    type: 'pago',
    data: { paymentId: id, invoiceNumber },
  });
  return c.json(updated);
});

paymentRoutes.post('/:id/remind', requireDirectora, async (c) => {
  const id = paramId(c);
  const [current] = await getDb().select().from(payments).where(eq(payments.id, id)).limit(1);
  if (!current) throw new HTTPException(404, { message: 'Pago no encontrado' });
  const [child] = await getDb()
    .select({ name: children.name, parentId: children.parentId })
    .from(children)
    .where(eq(children.id, current.childId))
    .limit(1);
  const due = current.dueDate ?? 'hoy';
  await notifyUser({
    userId: child?.parentId,
    title: `Recordatorio de mensualidad · ${child?.name}`,
    message: `Estimada familia: les recordamos que la mensualidad de ${child?.name} vence ${due}. Pueden pagar en efectivo o por QR desde su panel. Un saludo cordial, ${env.tenantName}.`,
    type: 'pago',
    data: { paymentId: id, kind: 'recordatorio' },
  });
  return c.json({ ok: true });
});

paymentRoutes.get('/:id/invoice', async (c) => {
  const id = paramId(c);
  const user = c.get('user');
  const db = getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  if (!payment) throw new HTTPException(404, { message: 'Pago no encontrado' });

  if (user.role !== 'directora') {
    if (user.role !== 'padre') {
      throw new HTTPException(403, { message: 'No puedes ver este recibo' });
    }
    const [child] = await db
      .select({ parentId: children.parentId })
      .from(children)
      .where(eq(children.id, payment.childId))
      .limit(1);
    if (!child || child.parentId !== user.id) {
      throw new HTTPException(403, { message: 'No puedes ver este recibo' });
    }
  }

  if (payment.status !== 'pagado') {
    throw new HTTPException(404, { message: 'Ese pago todavía no tiene recibo' });
  }

  if (!payment.invoiceNumber) {
    const invoiceNumber = await nextInvoiceNumber();
    await db.update(payments).set({ invoiceNumber }).where(eq(payments.id, id));
    payment.invoiceNumber = invoiceNumber;
  }

  let pdf = await readInvoicePdf(id);
  if (!pdf) {
    try {
      await buildInvoice(payment);
      pdf = await readInvoicePdf(id);
    } catch (error) {
      console.error('[invoice]', error);
    }
  }
  if (!pdf) throw new HTTPException(404, { message: 'El recibo no está disponible' });

  c.header('Content-Type', 'application/pdf');
  c.header(
    'Content-Disposition',
    `attachment; filename="recibo-${payment.invoiceNumber}.pdf"`,
  );
  return c.body(new Uint8Array(pdf));
});

paymentRoutes.get('/:id/proof-file', requireDirectora, async (c) => {
  const id = paramId(c);
  const [payment] = await getDb().select().from(payments).where(eq(payments.id, id)).limit(1);
  if (!payment?.proofPath) throw new HTTPException(404, { message: 'Sin comprobante' });
  try {
    const bytes = await fs.readFile(path.join(env.storageDir, payment.proofPath));
    c.header('Content-Type', 'application/octet-stream');
    return c.body(new Uint8Array(bytes));
  } catch {
    throw new HTTPException(404, { message: 'Archivo no encontrado' });
  }
});

paymentRoutes.patch('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  const body = await parseBody(c, createSchema.partial().omit({ childId: true }));
  const patch: Record<string, unknown> = {};
  if (body.amount !== undefined) patch.amount = body.amount.toFixed(2);
  if (body.months !== undefined) patch.months = body.months;
  if (body.method !== undefined) patch.method = body.method;
  if (body.observation !== undefined) patch.observation = body.observation;
  if (body.payerName !== undefined) patch.payerName = body.payerName;
  if (body.payerCi !== undefined) patch.payerCi = body.payerCi;
  if (body.periodStart !== undefined) patch.periodStart = body.periodStart;
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate;
  if (body.status !== undefined) {
    patch.status = body.status;
    patch.paidAt = body.status === 'pagado' ? new Date() : null;
  }
  const [updated] = await getDb().update(payments).set(patch).where(eq(payments.id, id)).returning();
  if (!updated) throw new HTTPException(404, { message: 'Pago no encontrado' });
  if (updated.status === 'pagado' && updated.invoiceNumber) {
    try {
      await buildInvoice(updated);
    } catch (error) {
      console.error('[invoice]', error);
    }
  }
  return c.json(updated);
});

paymentRoutes.delete('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  const [deleted] = await getDb()
    .delete(payments)
    .where(eq(payments.id, id))
    .returning({ id: payments.id });
  if (!deleted) throw new HTTPException(404, { message: 'Pago no encontrado' });
  return c.json({ ok: true });
});
