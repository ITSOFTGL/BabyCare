'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getTenantName } from '@/lib/api';
import { DIRECTORA_TABS, DEFAULT_DIRECTORA_TAB } from '@/lib/nav';

export function DashboardTopbarTitle() {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!user) return null;

  let label = 'Panel';
  let kicker = getTenantName();

  if (user.role === 'directora' && pathname === '/dashboard') {
    const activeId = searchParams.get('tab') ?? DEFAULT_DIRECTORA_TAB;
    const tab =
      DIRECTORA_TABS.find((t) => t.id === activeId) ?? DIRECTORA_TABS[0];
    label = tab.label;
    kicker = getTenantName();
  } else if (user.role === 'padre') {
    label = 'Familia';
  } else if (user.role === 'profesora' || user.role === 'auxiliar') {
    label = 'Mi sala';
  }

  return (
    <div className="min-w-0">
      <p className="truncate font-display text-xl font-semibold leading-tight tracking-tight text-ink sm:text-2xl">
        {label}
      </p>
      <p className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-ink-mute">
        {kicker}
      </p>
    </div>
  );
}
