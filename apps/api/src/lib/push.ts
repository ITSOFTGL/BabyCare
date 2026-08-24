import webpush from 'web-push';
import { eq, getDb, pushSubscriptions } from '@kidcare/db';
import { env } from '../env.ts';

let configured = false;
let warned = false;

/** true si hay claves VAPID configuradas y ya se le avisaron a la libreria. */
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    if (!warned) {
      console.warn(
        '[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configuradas: Web Push desactivado (las notificaciones in-app siguen funcionando).',
      );
      warned = true;
    }
    return false;
  }
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  configured = true;
  return true;
}

/**
 * Manda un push a TODAS las suscripciones activas de un usuario (puede tener
 * varias: una por navegador/dispositivo). Nunca tumba al llamador: cada envio
 * fallido se registra y, si la suscripcion ya no es valida (404/410), se
 * borra sola.
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; data?: unknown },
): Promise<void> {
  if (!ensureConfigured()) return;

  const db = getDb();
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // El navegador ya no reconoce esta suscripcion (desinstalada,
          // permiso revocado...); no tiene sentido reintentar nunca mas.
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error('[push] fallo al enviar:', error);
        }
      }
    }),
  );
}
