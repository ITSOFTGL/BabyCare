export function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Suma un mes calendario (1 ago → 1 sep). */
export function addOneMonth(dateStr: string): string {
  const [y, m, day] = dateStr.split('-').map(Number) as [number, number, number];
  const dt = new Date(y, m - 1 + 1, day);
  return toDateOnly(dt);
}

export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

export function periodFromPayDay(paidAt = new Date()): {
  periodStart: string;
  dueDate: string;
  month: string;
} {
  const periodStart = toDateOnly(paidAt);
  const dueDate = addOneMonth(periodStart);
  return {
    periodStart,
    dueDate,
    month: periodStart.slice(0, 7),
  };
}

export function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
