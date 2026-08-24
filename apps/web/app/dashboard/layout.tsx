'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { DesktopSidebar, MobileDrawer } from '@/components/Sidebar';
import { DashboardTopbarTitle } from '@/components/DashboardTopbarTitle';

/**
 * Guardia de la zona privada: sin token valido nadie ve el panel, se redirige
 * a /login. Tambien pinta el sidebar (fijo en desktop, drawer en movil) y la
 * barra superior comunes a los tres roles.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) return <Spinner label="Comprobando tu sesión…" />;
  if (!user) return <Spinner label="Redirigiendo al inicio de sesión…" />;

  return (
    <Suspense fallback={<Spinner label="Cargando panel…" />}>
      <div className="min-h-dvh">
        <DesktopSidebar />
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        <div className="lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-secondary/25 bg-background/85 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Abrir menú"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl text-ink/70 transition hover:bg-secondary/25 lg:hidden"
              >
                ☰
              </button>

              <div className="min-w-0 flex-1">
                <DashboardTopbarTitle />
              </div>

              <NotificationBell />
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </Suspense>
  );
}
