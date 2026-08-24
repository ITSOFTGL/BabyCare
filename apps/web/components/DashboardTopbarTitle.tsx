'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getTenantName } from '@/lib/api';
import { DIRECTORA_TABS, DEFAULT_DIRECTORA_TAB } from '@/lib/nav';

/**
 * Titulo dinamico de la barra superior: la pestana activa para la directora,
 * o una etiqueta fija para profesora/auxiliar/padre (esos roles no tienen
 * sub-navegacion, solo un panel).
 */
export function DashboardTopbarTitle() {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!user) return null;

  let emoji = '🧸';
  let label = 'Panel';

  if (user.role === 'directora' && pathname === '/dashboard') {
    const activeId = searchParams.get('tab') ?? DEFAULT_DIRECTORA_TAB;
    const tab = DIRECTORA_TABS.find((t) => t.id === activeId) ?? DIRECTORA_TABS[0];
    emoji = tab.emoji;
    label = tab.label;
  } else if (user.role === 'padre') {
    emoji = '👶';
    label = 'Mis hijos';
  } else if (user.role === 'profesora' || user.role === 'auxiliar') {
    emoji = '🎨';
    label = 'Mi sala';
  }

  return (
    <div className="min-w-0">
      <p className="truncate text-base font-bold leading-tight text-ink">
        <span className="mr-1.5">{emoji}</span>
        {label}
      </p>
      <p className="truncate text-xs font-medium text-ink/50 lg:hidden">
        {getTenantName()}
      </p>
    </div>
  );
}
