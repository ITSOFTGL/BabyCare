/**
 * Tipos compartidos entre la API (Hono) y el frontend (Next.js).
 *
 * Estos tipos describen el contrato HTTP, no las filas crudas de Drizzle:
 * la API serializa fechas a string ISO y los `numeric` de Postgres a string.
 */

export const ROLES = ['directora', 'profesora', 'auxiliar', 'padre'] as const;
export type Role = (typeof ROLES)[number];

export const TURNS = ['manana', 'tarde', 'completo'] as const;
export type Turn = (typeof TURNS)[number];

export const ACTIVITY_TYPES = [
  'biberon',
  'comida',
  'merienda',
  'almuerzo',
  'siesta',
  'panal',
  'observacion',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const PAYMENT_STATUSES = ['pendiente', 'en_revision', 'pagado'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  'efectivo',
  'qr',
  'transferencia',
  'tarjeta',
  'otro',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const NOTIFICATION_TYPES = [
  'info',
  'pago',
  'agenda',
  'alerta',
  'comunicado',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ANNOUNCEMENT_AUDIENCES = ['todos', 'sala', 'padre'] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  todos: 'Todos los padres',
  sala: 'Una sala',
  padre: 'Un alumno puntual',
};

/** Etiquetas en castellano para mostrar en la UI. */
export const ROLE_LABELS: Record<Role, string> = {
  directora: 'Directora',
  profesora: 'Profesora',
  auxiliar: 'Auxiliar',
  padre: 'Padre / Madre',
};

export const TURN_LABELS: Record<Turn, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  completo: 'Jornada completa',
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  biberon: 'Biberón',
  comida: 'Comida',
  merienda: 'Merienda',
  almuerzo: 'Almuerzo',
  siesta: 'Siesta',
  panal: 'Cambio de pañal',
  observacion: 'Observación',
};

export const ACTIVITY_EMOJI: Record<ActivityType, string> = {
  biberon: '🍼',
  comida: '🍽️',
  merienda: '🍎',
  almuerzo: '🍲',
  siesta: '😴',
  panal: '🧷',
  observacion: '📝',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  qr: 'QR',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendiente: 'Pendiente',
  en_revision: 'Por verificar',
  pagado: 'Pagado',
};

export const CHARGE_KINDS = ['panal', 'leche', 'otro'] as const;
export type ChargeKind = (typeof CHARGE_KINDS)[number];

export const CHARGE_KIND_LABELS: Record<ChargeKind, string> = {
  panal: 'Pañal',
  leche: 'Leche',
  otro: 'Otro',
};

/** Email de acceso a partir del nombre: Carla Diaz → carla.diaz@guarderia.test */
export function suggestEmail(fullName: string, domain = 'guarderia.test'): string {
  const parts = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return `usuario@${domain}`;
  if (parts.length === 1) return `${parts[0]}@${domain}`;
  return `${parts[0]}.${parts[parts.length - 1]}@${domain}`;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Level {
  id: string;
  name: string;
  ageMin: number;
  ageMax: number;
  monthlyFee: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  levelId: string | null;
  turn: Turn;
  capacity: number;
  createdAt: string;
  /** Se incluye cuando la ruta hace join con `levels`. */
  level?: Level | null;
}

export interface Guardian {
  id: string;
  childId: string;
  name: string;
  phone: string | null;
  email: string | null;
  ci: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface Child {
  id: string;
  name: string;
  birthDate: string;
  levelId: string | null;
  roomId: string | null;
  turn: Turn;
  authorizedPickup: string[];
  allergies: string | null;
  medications: string | null;
  observations: string | null;
  parentId: string | null;
  monthlyFee: string | null;
  createdAt: string;
  level?: Level | null;
  room?: Room | null;
  guardians?: Guardian[];
}

export interface Teacher {
  id: string;
  userId: string | null;
  name: string;
  specialty: string | null;
  roomId: string | null;
  turn: Turn;
  phone: string | null;
  email: string | null;
  createdAt: string;
  room?: Room | null;
}

export interface DailyActivity {
  id: string;
  childId: string;
  type: ActivityType;
  description: string | null;
  recordedBy: string | null;
  recordedAt: string;
  createdAt: string;
  childName?: string;
  recordedByName?: string | null;
  roomId?: string | null;
  roomName?: string | null;
}

export interface Payment {
  id: string;
  childId: string;
  amount: string;
  months: string[];
  status: PaymentStatus;
  method: PaymentMethod | null;
  observation: string | null;
  paidAt: string | null;
  invoiceNumber: string | null;
  periodStart: string | null;
  dueDate: string | null;
  payerName: string | null;
  payerCi: string | null;
  proofPath: string | null;
  createdAt: string;
  childName?: string;
}

export interface ExtraCharge {
  id: string;
  childId: string;
  kind: ChargeKind | string;
  description: string | null;
  amount: string;
  recordedBy: string | null;
  activityId: string | null;
  paymentId: string | null;
  createdAt: string;
  childName?: string;
  recordedByName?: string | null;
}

export interface Chat {
  id: string;
  kind: 'sala' | 'comunicado' | string;
  title: string;
  roomId: string | null;
  announcementId: string | null;
  createdAt: string;
  lastMessage?: string | null;
  lastAt?: string | null;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string | null;
  body: string;
  createdAt: string;
  authorName?: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  data: unknown;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  audience: AnnouncementAudience;
  roomId: string | null;
  childId: string | null;
  createdBy: string | null;
  recipientCount: number;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/** Resumen que devuelve `GET /api/dashboard`; el contenido depende del rol. */
export interface DashboardSummary {
  role: Role;
  tenantName: string;
  totals: {
    children: number;
    teachers: number;
    rooms: number;
    levels: number;
    pendingPayments: number;
    activitiesToday: number;
  };
  children: Child[];
  recentActivities: DailyActivity[];
  payments: Payment[];
  unreadNotifications: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
