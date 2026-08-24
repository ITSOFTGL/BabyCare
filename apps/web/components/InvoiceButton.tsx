'use client';

import { useState } from 'react';
import { downloadFile } from '@/lib/api';
import { Button } from '@/components/ui';

/**
 * Botón de "Descargar factura": solo tiene sentido si el pago ya esta
 * cobrado (invoiceNumber viene null hasta que se marca como pagado).
 */
export function InvoiceButton({
  paymentId,
  invoiceNumber,
}: {
  paymentId: string;
  invoiceNumber: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function onClick() {
    setBusy(true);
    setError(false);
    try {
      await downloadFile(
        `/payments/${paymentId}/invoice`,
        `factura-${invoiceNumber}.pdf`,
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="ghost" loading={busy} onClick={onClick}>
      {error ? '⚠️ Reintentar' : '📄 Descargar factura'}
    </Button>
  );
}
