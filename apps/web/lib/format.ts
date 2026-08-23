/**
 * Colores de acento rotativos para distinguir salas y niveles entre si.
 *
 * Son los UNICOS lugares del sistema donde se usan accent-pink/green/blue/
 * purple: nunca para transmitir un estado (pagado/pendiente, alergia,
 * error...), eso se resuelve con primary/secondary/ink. Estados y acentos no
 * se mezclan, o dejan de servir para diferenciar salas y niveles a simple
 * vista.
 */
export const ACCENTS = [
  'bg-accent-pink',
  'bg-accent-green',
  'bg-accent-blue',
  'bg-accent-purple',
] as const;

const ACCENT_BADGES = [
  'bg-accent-pink/20 text-ink',
  'bg-accent-green/20 text-ink',
  'bg-accent-blue/20 text-ink',
  'bg-accent-purple/20 text-ink',
] as const;

function accentIndex(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(hash) % ACCENTS.length;
}

/** Elige siempre el mismo acento (bg solido) para el mismo id de sala/nivel. */
export function accentFor(key: string | null | undefined): string {
  if (!key) return 'bg-primary';
  return ACCENTS[accentIndex(key)]!;
}

/** Version en "chip" (fondo suave) del mismo acento, para badges de texto. */
export function accentBadgeFor(key: string | null | undefined): string {
  if (!key) return 'bg-secondary/25 text-ink';
  return ACCENT_BADGES[accentIndex(key)]!;
}

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Edad en anos y meses, para las fichas de los alumnos. */
export function formatAge(birthDate: string | null | undefined): string {
  if (!birthDate) return '—';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return '—';
  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) return '—';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} ${rest === 1 ? 'mes' : 'meses'}`;
  return rest === 0 ? `${years} ${years === 1 ? 'año' : 'años'}` : `${years} a. ${rest} m.`;
}

/** Mes actual en formato AAAA-MM, el que espera la API de pagos. */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
