'use client';

import { useState } from 'react';
import { downloadFile } from '@/lib/api';
import { Button } from '@/components/ui';

export function InvoiceButton({
  paymentId,
  invoiceNumber,
}: {
  paymentId: string;
  invoiceNumber?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const fileName = `recibo-${invoiceNumber || paymentId}.pdf`;

  async function onClick() {
    setBusy(true);
    setError(false);
    try {
      await downloadFile(`/payments/${paymentId}/invoice`, fileName);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="ghost" icon="download" loading={busy} onClick={onClick}>
      {error ? 'Reintentar' : 'Recibo'}
    </Button>
  );
}
