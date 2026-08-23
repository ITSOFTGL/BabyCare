/**
 * Esquema KidCare v1.
 *
 * IMPORTANTE: una base de datos = una sola guarderia. El aislamiento entre
 * clientes es a nivel de base de datos completa (cada instancia Docker apunta a
 * su propia DB en el Postgres compartido), por eso NO existe ninguna columna
 * `tenant_id` en este esquema.
 */
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', [
  'directora',
  'profesora',
  'auxiliar',
  'padre',
]);

export const turnEnum = pgEnum('turn', ['manana', 'tarde', 'completo']);

export const activityTypeEnum = pgEnum('activity_type', [
  'biberon',
  'comida',
  'siesta',
  'panal',
  'observacion',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pendiente',
  'pagado',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'efectivo',
  'transferencia',
  'tarjeta',
  'otro',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'info',
  'pago',
  'agenda',
  'alerta',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: roleEnum('role').notNull().default('padre'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const levels = pgTable('levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ageMin: integer('age_min').notNull().default(0),
  ageMax: integer('age_max').notNull().default(0),
  monthlyFee: numeric('monthly_fee', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  levelId: uuid('level_id').references(() => levels.id, {
    onDelete: 'set null',
  }),
  turn: turnEnum('turn').notNull().default('manana'),
  capacity: integer('capacity').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const children = pgTable('children', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  birthDate: date('birth_date').notNull(),
  levelId: uuid('level_id').references(() => levels.id, {
    onDelete: 'set null',
  }),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  turn: turnEnum('turn').notNull().default('manana'),
  /** Nombres de las personas autorizadas a retirar al nino. */
  authorizedPickup: text('authorized_pickup')
    .array()
    .notNull()
    .default([] as string[]),
  allergies: text('allergies'),
  medications: text('medications'),
  observations: text('observations'),
  /** Cuenta de usuario del apoderado que ve la agenda y los pagos. */
  parentId: uuid('parent_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  monthlyFee: numeric('monthly_fee', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const guardians = pgTable('guardians', {
  id: uuid('id').primaryKey().defaultRandom(),
  childId: uuid('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teachers = pgTable('teachers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  specialty: text('specialty'),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  turn: turnEnum('turn').notNull().default('manana'),
  phone: text('phone'),
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const dailyActivities = pgTable('daily_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  childId: uuid('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  type: activityTypeEnum('type').notNull(),
  description: text('description'),
  /** Usuario (profesora/auxiliar) que registro la actividad. */
  recordedBy: uuid('recorded_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  recordedAt: timestamp('recorded_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  childId: uuid('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  /** Meses cubiertos por el pago, en formato `YYYY-MM`. */
  months: text('months').array().notNull().default([] as string[]),
  status: paymentStatusEnum('status').notNull().default('pendiente'),
  method: paymentMethodEnum('method'),
  observation: text('observation'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: notificationTypeEnum('type').notNull().default('info'),
  read: boolean('read').notNull().default(false),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type LevelRow = typeof levels.$inferSelect;
export type RoomRow = typeof rooms.$inferSelect;
export type ChildRow = typeof children.$inferSelect;
export type GuardianRow = typeof guardians.$inferSelect;
export type TeacherRow = typeof teachers.$inferSelect;
export type DailyActivityRow = typeof dailyActivities.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
