'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ROLE_LABELS } from '@kidcare/types';
import { useAuth } from '@/lib/auth';
import { getTenantName } from '@/lib/api';
import { DIRECTORA_TABS, DEFAULT_DIRECTORA_TAB } from '@/lib/nav';
import { BrandMark, Icon } from '@/components/icons';
import { Avatar, Button, cx } from '@/components/ui';

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? DEFAULT_DIRECTORA_TAB;

  if (!user) return null;

  if (user.role === 'directora') {
    const main = DIRECTORA_TABS.filter((t) =>
      ['inicio', 'alumnos', 'salas', 'niveles', 'profesoras', 'pagos', 'agenda'].includes(
        t.id,
      ),
    );
    const admin = DIRECTORA_TABS.filter((t) =>
      ['reportes', 'cuentas', 'comunicados'].includes(t.id),
    );

    return (
      <nav className="flex flex-col gap-6 px-3">
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-mute">
            Casa
          </p>
          <div className="flex flex-col gap-0.5">
            {main.map((item) => {
              const active = pathname === '/dashboard' && activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={`/dashboard?tab=${item.id}`}
                  onClick={onNavigate}
                  className={cx(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-150',
                    active
                      ? 'bg-primary text-white shadow-lift'
                      : 'text-ink-soft hover:bg-gold-light/70 hover:text-ink',
                  )}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-mute">
            Dirección
          </p>
          <div className="flex flex-col gap-0.5">
            {admin.map((item) => {
              const active = pathname === '/dashboard' && activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={`/dashboard?tab=${item.id}`}
                  onClick={onNavigate}
                  className={cx(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-150',
                    active
                      ? 'bg-primary text-white shadow-lift'
                      : 'text-ink-soft hover:bg-gold-light/70 hover:text-ink',
                  )}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  const single =
    user.role === 'padre'
      ? { icon: 'heart' as const, label: 'Mis hijos' }
      : { icon: 'room' as const, label: 'Mi sala' };

  return (
    <nav className="flex flex-col gap-1 px-3">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-2xl bg-primary px-3 py-2.5 text-[13.5px] font-semibold text-white shadow-lift"
      >
        <Icon name={single.icon} size={18} />
        {single.label}
      </Link>
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <BrandMark size={40} className="text-primary" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold leading-tight text-ink">
            KidCare
          </p>
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">
            {getTenantName()}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        <NavLinks onNavigate={onNavigate} />
      </div>

      <div className="border-t border-ink/[0.06] px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar name={user.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-mute">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon="logout"
          onClick={logout}
          className="w-full justify-start"
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[272px] border-r border-ink/[0.06] bg-surface/90 backdrop-blur-xl lg:flex">
      <SidebarBody />
    </aside>
  );
}

export function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <div
      className={cx(
        'fixed inset-0 z-40 lg:hidden',
        !open && 'pointer-events-none',
      )}
      aria-hidden={!open}
    >
      <div
        className={cx(
          'absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <div
        className={cx(
          'absolute inset-y-0 left-0 w-[272px] max-w-[85vw] bg-surface shadow-pop transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarBody onNavigate={onClose} />
      </div>
    </div>
  );
}
