import { promises as fs } from 'node:fs';
import path from 'node:path';
import { eq, getDb, settings } from '@kidcare/db';
import { env } from '../env.ts';

const QR_KEY = 'qr_file';
const QR_EXPIRES_KEY = 'qr_expires_at';

export function qrFilePath() {
  return path.join(env.storageDir, 'qr-guarderia.png');
}

const DEFAULT_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="360" viewBox="0 0 320 360">
  <rect width="320" height="360" fill="#F3EEE6"/>
  <rect x="32" y="28" width="256" height="256" rx="16" fill="#1F1A14"/>
  <rect x="48" y="44" width="224" height="224" fill="#FFFCF7"/>
  <g fill="#C45C3E">
    <rect x="64" y="60" width="56" height="56"/>
    <rect x="200" y="60" width="56" height="56"/>
    <rect x="64" y="196" width="56" height="56"/>
    <rect x="80" y="76" width="24" height="24" fill="#FFFCF7"/>
    <rect x="216" y="76" width="24" height="24" fill="#FFFCF7"/>
    <rect x="80" y="212" width="24" height="24" fill="#FFFCF7"/>
    <rect x="140" y="140" width="40" height="40"/>
    <rect x="188" y="140" width="16" height="16"/>
    <rect x="140" y="188" width="16" height="16"/>
    <rect x="204" y="188" width="24" height="24"/>
    <rect x="140" y="76" width="16" height="16"/>
    <rect x="172" y="92" width="16" height="40"/>
    <rect x="92" y="148" width="32" height="16"/>
  </g>
  <text x="160" y="322" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#1F1A14">QR de cobro · KidCare</text>
  <text x="160" y="342" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#8A8074">Válido 1 año · reemplázalo con el QR del banco</text>
</svg>`;

export async function ensureDefaultQr() {
  await fs.mkdir(env.storageDir, { recursive: true });
  try {
    await fs.access(qrFilePath());
  } catch {
    await fs.writeFile(path.join(env.storageDir, 'qr-guarderia.svg'), DEFAULT_SVG);
  }
  const db = getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, QR_EXPIRES_KEY)).limit(1);
  if (!row) {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    await db.insert(settings).values({
      key: QR_EXPIRES_KEY,
      value: expires.toISOString().slice(0, 10),
    });
    await db.insert(settings).values({ key: QR_KEY, value: 'qr-guarderia.svg' });
  }
}

export async function saveQrUpload(bytes: Uint8Array, ext: string) {
  await fs.mkdir(env.storageDir, { recursive: true });
  const name = `qr-guarderia.${ext}`;
  await fs.writeFile(path.join(env.storageDir, name), bytes);
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  const db = getDb();
  await db.delete(settings).where(eq(settings.key, QR_KEY));
  await db.delete(settings).where(eq(settings.key, QR_EXPIRES_KEY));
  await db.insert(settings).values({ key: QR_KEY, value: name });
  await db.insert(settings).values({
    key: QR_EXPIRES_KEY,
    value: expires.toISOString().slice(0, 10),
  });
  return { file: name, expiresAt: expires.toISOString().slice(0, 10) };
}

export async function readQr(): Promise<{ bytes: Buffer; contentType: string; expiresAt: string | null } | null> {
  await ensureDefaultQr();
  const db = getDb();
  const [fileRow] = await db.select().from(settings).where(eq(settings.key, QR_KEY)).limit(1);
  const [expRow] = await db.select().from(settings).where(eq(settings.key, QR_EXPIRES_KEY)).limit(1);
  const file = fileRow?.value ?? 'qr-guarderia.svg';
  const full = path.join(env.storageDir, file);
  try {
    const bytes = await fs.readFile(full);
    const contentType = file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.jpg') || file.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
    return { bytes, contentType, expiresAt: expRow?.value ?? null };
  } catch {
    return null;
  }
}

export async function qrMeta() {
  await ensureDefaultQr();
  const [expRow] = await getDb().select().from(settings).where(eq(settings.key, QR_EXPIRES_KEY)).limit(1);
  return { expiresAt: expRow?.value ?? null };
}
