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
  'siesta',
  'panal',
  'observacion',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const PAYMENT_STATUSES = ['pendiente', 'pagado'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  'efectivo',
  'transferencia',
  'tarjeta',
  'otro',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const NOTIFICATION_TYPES = ['info', 'pago', 'agenda', 'alerta'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

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
  siesta: 'Siesta',
  panal: 'Cambio de pañal',
  observacion: 'Observación',
};

export const ACTIVITY_EMOJI: Record<ActivityType, string> = {
  biberon: '🍼',
  comida: '🍽️',
  siesta: '😴',
  panal: '🧷',
  observacion: '📝',
};

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
  createdAt: string;
  childName?: string;
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
