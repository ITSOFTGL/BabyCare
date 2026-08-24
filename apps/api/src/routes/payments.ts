import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import {
  and,
  children,
  desc,
  eq,
  getDb,
  inArray,
  payments,
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
});

const paySchema = z.object({
  method: z.enum(PAYMENT_METHODS).default('efectivo'),
  observation: z.string().max(500).optional().nullable(),
});

export const paymentRoutes = new Hono<AppEnv>();

paymentRoutes.use('*', requireAuth);

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
    throw new HTTPException(403, {
      message: 'No puedes ver los pagos de este alumno',
    });
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

paymentRoutes.post('/', requireDirectora, async (c) => {
  const body = await parseBody(c, createSchema);
  const db = getDb();

  const [child] = await db
    .select({ id: children.id, name: children.name, parentId: children.parentId })
    .from(children)
    .where(eq(children.id, body.childId))
    .limit(1);
  if (!child) throw new HTTPException(404, { message: 'Alumno no encontrado' });

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
    })
    .returning();

  await notifyUser({
    userId: child.parentId,
    title:
      body.status === 'pagado'
        ? `Pago registrado de ${child.name}`
        : `Nueva cuota pendiente de ${child.name}`,
    message: `${body.months.join(', ')} — ${body.amount.toFixed(2)} €`,
    type: 'pago',
    data: { paymentId: created!.id, childId: child.id },
  });

  return c.json({ ...created, childName: child.name }, 201);
});

/** Marca una cuota pendiente como pagada. */
paymentRoutes.patch('/:id/pay', requireDirectora, async (c) => {
  const id = paramId(c);
  const body = await parseBody(c, paySchema);
  const db = getDb();

  const [current] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);
  if (!current) throw new HTTPException(404, { message: 'Pago no encontrado' });
  if (current.status === 'pagado') {
    throw new HTTPException(409, { message: 'Ese pago ya estaba cobrado' });
  }

  const paidAt = new Date();
  const invoiceNumber = await nextInvoiceNumber();

  const [updated] = await db
    .update(payments)
    .set({
      status: 'pagado',
      method: body.method,
      paidAt,
      observation: body.observation ?? current.observation,
      invoiceNumber,
    })
    .where(eq(payments.id, id))
    .returning();

  const [child] = await db
    .select({ name: children.name, parentId: children.parentId })
    .from(children)
    .where(eq(children.id, current.childId))
    .limit(1);

  // La factura no debe tumbar la confirmacion del pago si algo falla al
  // generarla (disco lleno, etc.): se puede regenerar despues si hace falta.
  try {
    await generateInvoicePdf({
      paymentId: id,
      invoiceNumber,
      tenantName: env.tenantName,
      childName: child?.name ?? 'Alumno',
      months: current.months,
      amount: current.amount,
      method: body.method,
      paidAt,
    });
  } catch (error) {
    console.error('[invoice] no se pudo generar el PDF:', error);
  }

  await notifyUser({
    userId: child?.parentId,
    title: `Pago confirmado de ${child?.name ?? 'tu hijo/a'}`,
    message: `Recibimos ${current.amount} € por ${current.months.join(', ')}. ¡Gracias!`,
    type: 'pago',
    data: { paymentId: id, invoiceNumber },
  });

  return c.json({ ...updated, childName: child?.name });
});

/**
 * Descarga la factura en PDF de un pago ya cobrado. Solo la directora, o el
 * padre dueno de ese alumno, pueden verla: no es una ruta de solo lectura
 * generica como el resto de GET /payments.
 */
paymentRoutes.get('/:id/invoice', async (c) => {
  const id = paramId(c);
  const user = c.get('user');
  const db = getDb();

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);
  if (!payment) throw new HTTPException(404, { message: 'Pago no encontrado' });

  if (user.role !== 'directora') {
    if (user.role !== 'padre') {
      throw new HTTPException(403, { message: 'No puedes ver esta factura' });
    }
    const [child] = await db
      .select({ parentId: children.parentId })
      .from(children)
      .where(eq(children.id, payment.childId))
      .limit(1);
    if (!child || child.parentId !== user.id) {
      throw new HTTPException(403, { message: 'No puedes ver esta factura' });
    }
  }

  if (payment.status !== 'pagado' || !payment.invoiceNumber) {
    throw new HTTPException(404, { message: 'Ese pago todavía no tiene factura' });
  }

  const pdf = await readInvoicePdf(id);
  if (!pdf) {
    throw new HTTPException(404, { message: 'La factura no está disponible' });
  }

  c.header('Content-Type', 'application/pdf');
  c.header(
    'Content-Disposition',
    `attachment; filename="factura-${payment.invoiceNumber}.pdf"`,
  );
  return c.body(new Uint8Array(pdf));
});

paymentRoutes.patch('/:id', requireDirectora, async (c) => {
  const id = paramId(c);
  const body = await parseBody(c, createSchema.partial().omit({ childId: true }));

  const patch: Record<string, unknown> = {};
  if (body.amount !== undefined) patch.amount = body.amount.toFixed(2);
  if (body.months !== undefined) patch.months = body.months;
  if (body.method !== undefined) patch.method = body.method;
  if (body.observation !== undefined) patch.observation = body.observation;
  if (body.status !== undefined) {
    patch.status = body.status;
    patch.paidAt = body.status === 'pagado' ? new Date() : null;
  }

  const [updated] = await getDb()
    .update(payments)
    .set(patch)
    .where(eq(payments.id, id))
    .returning();
  if (!updated) throw new HTTPException(404, { message: 'Pago no encontrado' });
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
