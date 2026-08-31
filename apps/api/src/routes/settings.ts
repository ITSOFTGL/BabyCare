import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { qrMeta, readQr, saveQrUpload } from '../lib/qr.ts';
import { requireAuth, requireDirectora, type AppEnv } from '../middleware/auth.ts';

export const settingsRoutes = new Hono<AppEnv>();
settingsRoutes.use('*', requireAuth);

settingsRoutes.get('/qr', async (c) => {
  const file = await readQr();
  if (!file) throw new HTTPException(404, { message: 'No hay QR cargado' });
  c.header('Content-Type', file.contentType);
  c.header('Cache-Control', 'no-cache');
  if (file.expiresAt) c.header('X-Qr-Expires', file.expiresAt);
  return c.body(new Uint8Array(file.bytes));
});

settingsRoutes.get('/qr-meta', async (c) => c.json(await qrMeta()));

settingsRoutes.post('/qr', requireDirectora, async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!file || typeof file === 'string') {
    throw new HTTPException(400, { message: 'Adjunta la imagen del QR' });
  }
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const allowed = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
  if (!allowed.includes(ext)) {
    throw new HTTPException(400, { message: 'Usa PNG, JPG o SVG' });
  }
  const meta = await saveQrUpload(new Uint8Array(await file.arrayBuffer()), ext);
  return c.json(meta);
});
