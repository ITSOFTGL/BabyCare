'use client';

import { useEffect, useState } from 'react';
import { fetchQrObjectUrl } from '@/lib/api';

export function QrImage({
  className = 'mx-auto h-56 w-56 rounded-2xl bg-canvas object-contain p-2',
}: {
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    void fetchQrObjectUrl()
      .then((next) => {
        if (cancelled) {
          URL.revokeObjectURL(next);
          return;
        }
        url = next;
        setSrc(next);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  if (!src) {
    return (
      <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-ink-mute">
        Cargando QR de la guardería…
      </p>
    );
  }

  return <img src={src} alt="QR de cobro de la guardería" className={className} />;
}
