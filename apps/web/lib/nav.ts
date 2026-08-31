import type { IconName } from '@/components/icons';

/**
 * Pestañas de la directora, compartidas entre el Sidebar y DirectoraView.
 */
export const DIRECTORA_TABS = [
  { id: 'inicio', label: 'Inicio', icon: 'home' as IconName },
  { id: 'alumnos', label: 'Alumnos', icon: 'child' as IconName },
  { id: 'salas', label: 'Salas', icon: 'room' as IconName },
  { id: 'niveles', label: 'Niveles', icon: 'level' as IconName },
  { id: 'profesoras', label: 'Equipo', icon: 'teacher' as IconName },
  { id: 'pagos', label: 'Pagos', icon: 'payment' as IconName },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' as IconName },
  { id: 'reportes', label: 'Reportes', icon: 'report' as IconName },
  { id: 'cuentas', label: 'Cuentas', icon: 'account' as IconName },
  { id: 'comunicados', label: 'Comunicados', icon: 'announce' as IconName },
] as const;

export type DirectoraTabId = (typeof DIRECTORA_TABS)[number]['id'];

export const DEFAULT_DIRECTORA_TAB: DirectoraTabId = 'inicio';

export function isDirectoraTabId(value: string | null): value is DirectoraTabId {
  return DIRECTORA_TABS.some((t) => t.id === value);
}
