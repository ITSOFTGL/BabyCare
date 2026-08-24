import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { count, getDb, isNotNull, payments } from '@kidcare/db';
import { env } from '../env.ts';

// Mismos tonos que el sistema de diseno del frontend (primary/ink/muted).
const PRIMARY = rgb(0.976, 0.451, 0.086);
const INK = rgb(0.118, 0.161, 0.231);
const MUTED = rgb(0.42, 0.46, 0.52);
const LINE = rgb(0.91, 0.91, 0.91);

function invoicesDir(): string {
  return path.join(env.storageDir, 'invoices');
}

/** Ruta en disco donde vive (o vivira) la factura de un pago. */
export function invoiceFilePath(paymentId: string): string {
  return path.join(invoicesDir(), `${paymentId}.pdf`);
}

/**
 * Numero de factura secuencial por guarderia: como cada base de datos es de
 * una sola guarderia (ver esquema), un contador simple basta. La ligera
 * ventana de carrera entre leer el conteo y guardar (si dos pagos se cobran
 * exactamente al mismo tiempo) es aceptable para el volumen de una
 * guarderia; no hace falta un bloqueo dedicado.
 */
export async function nextInvoiceNumber(): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({ n: count() })
    .from(payments)
    .where(isNotNull(payments.invoiceNumber));
  const seq = (row?.n ?? 0) + 1;
  const year = new Date().getFullYear();
  return `INV-${year}-${String(seq).padStart(5, '0')}`;
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
}

/** Genera el PDF de la factura y lo guarda en STORAGE_DIR/invoices/{paymentId}.pdf. */
export async function generateInvoicePdf(data: InvoiceData): Promise<void> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 56;
  let y = height - 70;

  page.drawText(data.tenantName, { x: marginX, y, size: 22, font: bold, color: PRIMARY });
  y -= 20;
  page.drawText('Recibo de pago', { x: marginX, y, size: 12, font, color: MUTED });

  page.drawText(data.invoiceNumber, {
    x: width - marginX - bold.widthOfTextAtSize(data.invoiceNumber, 12),
    y: height - 70,
    size: 12,
    font: bold,
    color: INK,
  });
  const dateLabel = data.paidAt.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  page.drawText(dateLabel, {
    x: width - marginX - font.widthOfTextAtSize(dateLabel, 10),
    y: height - 90,
    size: 10,
    font,
    color: MUTED,
  });

  y -= 40;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: width - marginX, y },
    thickness: 1,
    color: LINE,
  });
  y -= 36;

  const row = (label: string, value: string) => {
    page.drawText(label, { x: marginX, y, size: 11, font: bold, color: INK });
    page.drawText(value, { x: marginX + 160, y, size: 11, font, color: INK });
    y -= 24;
  };

  row('Alumno', data.childName);
  row('Concepto', 'Mensualidad de guardería');
  row('Meses cubiertos', data.months.join(', '));
  row('Método de pago', data.method ?? 'No especificado');

  y -= 16;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: width - marginX, y },
    thickness: 1,
    color: LINE,
  });
  y -= 44;

  page.drawText('Total pagado', { x: marginX, y: y + 4, size: 14, font: bold, color: INK });
  const amountLabel = `${Number(data.amount).toFixed(2)} €`;
  page.drawText(amountLabel, {
    x: width - marginX - bold.widthOfTextAtSize(amountLabel, 20),
    y,
    size: 20,
    font: bold,
    color: PRIMARY,
  });

  const footer = 'Generado automáticamente por KidCare.';
  page.drawText(footer, { x: marginX, y: 70, size: 9, font, color: MUTED });

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
