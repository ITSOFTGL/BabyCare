import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { count, getDb, isNotNull, payments } from '@kidcare/db';
import { env } from '../env.ts';

const CLAY = rgb(0.769, 0.361, 0.243);
const INK = rgb(0.122, 0.102, 0.078);
const MUTED = rgb(0.36, 0.325, 0.282);
const LINE = rgb(0.86, 0.82, 0.76);
const CREAM = rgb(0.976, 0.965, 0.941);

function invoicesDir(): string {
  return path.join(env.storageDir, 'invoices');
}

export function invoiceFilePath(paymentId: string): string {
  return path.join(invoicesDir(), `${paymentId}.pdf`);
}

export async function nextInvoiceNumber(): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({ n: count() })
    .from(payments)
    .where(isNotNull(payments.invoiceNumber));
  const seq = (row?.n ?? 0) + 1;
  const year = new Date().getFullYear();
  return `REC-${year}-${String(seq).padStart(4, '0')}`;
}

export interface InvoiceData {
  paymentId: string;
  invoiceNumber: string;
  tenantName: string;
  childName: string;
  months: string[];
  amount: string;
  method: string | null;
  paidAt: Date;
  payerName?: string | null;
  payerCi?: string | null;
  periodStart?: string | null;
  dueDate?: string | null;
}

function moneyBs(amount: string | number): string {
  const n = Number(amount);
  return `${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
}

export async function generateInvoicePdf(data: InvoiceData): Promise<void> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: CLAY });
  page.drawText(data.tenantName.toUpperCase(), {
    x: 48,
    y: height - 52,
    size: 18,
    font: bold,
    color: CREAM,
  });
  page.drawText('Recibo de mensualidad', {
    x: 48,
    y: height - 76,
    size: 12,
    font,
    color: rgb(0.94, 0.88, 0.82),
  });
  page.drawText(data.invoiceNumber, {
    x: width - 48 - bold.widthOfTextAtSize(data.invoiceNumber, 12),
    y: height - 52,
    size: 12,
    font: bold,
    color: CREAM,
  });
  const dateLabel = data.paidAt.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  page.drawText(dateLabel, {
    x: width - 48 - font.widthOfTextAtSize(dateLabel, 10),
    y: height - 76,
    size: 10,
    font,
    color: rgb(0.94, 0.88, 0.82),
  });

  let y = height - 170;
  const row = (label: string, value: string) => {
    page.drawText(label.toUpperCase(), { x: 48, y, size: 8, font: bold, color: MUTED });
    page.drawText(value || '—', { x: 48, y: y - 16, size: 12, font, color: INK });
    y -= 44;
  };

  row('A nombre de / apoderado', data.payerName ?? '—');
  row('Cédula de identidad', data.payerCi ?? '—');
  row('Alumno', data.childName);
  row('Periodo cubierto', data.months.join(', ') || 'Mensualidad');
  if (data.periodStart && data.dueDate) {
    row('Vigencia', `${data.periodStart}  →  vence ${data.dueDate}`);
  }
  const methodLabel =
    data.method === 'qr'
      ? 'QR'
      : data.method === 'efectivo'
        ? 'Efectivo'
        : data.method ?? 'No especificado';
  row('Método de pago', methodLabel);

  y -= 8;
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: LINE });
  y -= 36;

  page.drawRectangle({ x: 48, y: y - 28, width: width - 96, height: 56, color: rgb(0.96, 0.93, 0.88) });
  page.drawText('Total cobrado', { x: 64, y: y + 4, size: 10, font, color: MUTED });
  const amountLabel = moneyBs(data.amount);
  page.drawText(amountLabel, {
    x: width - 64 - bold.widthOfTextAtSize(amountLabel, 20),
    y,
    size: 20,
    font: bold,
    color: CLAY,
  });

  page.drawText(
    'Documento generado por KidCare. Conservar como constancia de pago.',
    { x: 48, y: 64, size: 9, font, color: MUTED },
  );

  const bytes = await doc.save();
  await fs.mkdir(invoicesDir(), { recursive: true });
  await fs.writeFile(invoiceFilePath(data.paymentId), bytes);
}

export async function readInvoicePdf(paymentId: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(invoiceFilePath(paymentId));
  } catch {
    return null;
  }
}
