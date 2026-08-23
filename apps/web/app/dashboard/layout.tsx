'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_LABELS } from '@kidcare/types';
import { useAuth } from '@/lib/auth';
import { TENANT_NAME } from '@/lib/api';
import { initials } from '@/lib/format';
import { Button, Spinner } from '@/components/ui';

/**
 * Guardia de la zona privada: sin token valido nadie ve el panel, se redirige
 * a /login. Tambien pinta la cabecera comun a los tres roles.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) return <Spinner label="Comprobando tu sesión…" />;
  if (!user) return <Spinner label="Redirigiendo al inicio de sesión…" />;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-secondary/25 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl shadow-lift">
            🧸
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold leading-tight text-primary">
              KidCare
            </p>
            <p className="truncate text-xs font-medium text-ink/50">
              {TENANT_NAME}
            </p>
          </div>

          <div className="hidden text-right sm:block">
            <p className="truncate text-sm font-semibold text-ink">
              {user.name}
            </p>
            <p className="text-xs text-ink/50">{ROLE_LABELS[user.role]}</p>
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/35 text-sm font-bold text-ink"
            title={`${user.name} · ${ROLE_LABELS[user.role]}`}
          >
            {initials(user.name)}
          </div>

          <Button variant="ghost" size="sm" onClick={logout}>
            Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
