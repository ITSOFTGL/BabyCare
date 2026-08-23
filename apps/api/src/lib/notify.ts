import { getDb, notifications } from '@kidcare/db';
import type { NotificationType } from '@kidcare/types';

/**
 * Crea una notificacion in-app (v1: solo tabla, sin Web Push).
 * Nunca debe tumbar la request principal, por eso traga sus propios errores.
 */
export async function notifyUser(input: {
  userId: string | null | undefined;
  title: string;
  message: string;
  type?: NotificationType;
  data?: unknown;
}): Promise<void> {
  if (!input.userId) return;
  try {
    await getDb()
      .insert(notifications)
      .values({
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? 'info',
        data: (input.data ?? null) as never,
      });
  } catch (error) {
    console.error('[notify] no se pudo crear la notificacion:', error);
  }
}
