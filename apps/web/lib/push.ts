import { apiDelete, apiGet, apiPost } from './api';

/** El navegador entrega la clave VAPID en base64url; PushManager la pide como Uint8Array. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export type PushStatus = 'unsupported' | 'subscribed' | 'denied' | 'default';

/** Estado actual de ESTE navegador: no confundir con si el usuario tiene push activo en otro dispositivo. */
export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration();
  const existing = await reg?.pushManager.getSubscription();
  if (existing) return 'subscribed';
  return Notification.permission as PushStatus;
}

/** Pide permiso, registra el service worker y manda la suscripcion a la API. */
export async function enablePush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Este navegador no soporta notificaciones push');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones denegado');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  const { publicKey } = await apiGet<{ publicKey: string }>(
    '/push/vapid-public-key',
  );

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    // TS 5.7's dom lib requires ArrayBufferView<ArrayBuffer>, pero
    // Uint8Array.from() tipa el buffer como ArrayBufferLike (incluye
    // SharedArrayBuffer); en el navegador siempre es un ArrayBuffer normal.
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  const json = subscription.toJSON();
  await apiPost('/push/subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
  });
}

/** Cancela la suscripcion de ESTE navegador, tanto en el push service como en la API. */
export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await apiDelete(`/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`);
}
