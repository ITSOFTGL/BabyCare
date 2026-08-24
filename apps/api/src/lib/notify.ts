import { getDb, notifications } from '@kidcare/db';
import type { NotificationType } from '@kidcare/types';
import { sendPushToUser } from './push.ts';

/**
 * Crea una notificacion in-app y, si el usuario activo Web Push, tambien se
 * la manda al navegador. Nunca debe tumbar la request principal: ni guardar
 * la notificacion ni el push (que ademas es un no-op silencioso si no hay
 * claves VAPID configuradas) pueden hacer fallar a quien llama esto.
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
    return;
  }

  try {
    await sendPushToUser(input.userId, {
      title: input.title,
      body: input.message,
      data: input.data,
    });
  } catch (error) {
    console.error('[notify] no se pudo enviar el push:', error);
  }
}
