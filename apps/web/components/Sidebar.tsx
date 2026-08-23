'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ROLE_LABELS } from '@kidcare/types';
import { useAuth } from '@/lib/auth';
import { getTenantName } from '@/lib/api';
import { initials } from '@/lib/format';
import { DIRECTORA_TABS, DEFAULT_DIRECTORA_TAB } from '@/lib/nav';
import { Button, cx } from '@/components/ui';

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? DEFAULT_DIRECTORA_TAB;

  if (!user) return null;

  if (user.role === 'directora') {
    return (
      <nav className="flex flex-col gap-1 px-3">
        {DIRECTORA_TABS.map((item) => {
          const active = pathname === '/dashboard' && activeTab === item.id;
          return (
            <Link
              key={item.id}
              href={`/dashboard?tab=${item.id}`}
              onClick={onNavigate}
              className={cx(
                'flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition',
                active
                  ? 'bg-primary/15 text-primary-dark shadow-sm'
                  : 'text-ink/60 hover:bg-secondary/20 hover:text-ink',
              )}
            >
              <span className="text-lg">{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  const single =
    user.role === 'padre'
      ? { emoji: '👶', label: 'Mis hijos' }
      : { emoji: '🎨', label: 'Mi sala' };

  return (
    <nav className="flex flex-col gap-1 px-3">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-2xl bg-primary/15 px-4 py-2.5 text-sm font-semibold text-primary-dark shadow-sm"
      >
        <span className="text-lg">{single.emoji}</span>
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
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-11 w-11 shrink-0 animate-float items-center justify-center rounded-2xl bg-primary text-xl shadow-lift">
          🧸
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-tight text-primary">
            KidCare
          </p>
          <p className="truncate text-xs font-medium text-ink/50">
            {getTenantName()}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <NavLinks onNavigate={onNavigate} />
      </div>

      <div className="border-t border-secondary/25 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/35 text-sm font-bold text-ink">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {user.name}
            </p>
            <p className="truncate text-xs text-ink/50">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="w-full">
          Salir
        </Button>
      </div>
    </div>
  );
}

/** Sidebar fijo, visible solo desde el breakpoint lg (≥1024px) en adelante. */
export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-secondary/25 bg-white lg:flex">
      <SidebarBody />
    </aside>
  );
}

/** Drawer off-canvas para pantallas pequenas, con overlay y cierre por Escape. */
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
          'absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-soft transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarBody onNavigate={onClose} />
      </div>
    </div>
  );
}
