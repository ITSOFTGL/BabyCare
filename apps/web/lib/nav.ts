/**
 * Pestanas de la directora, compartidas entre el Sidebar (que las convierte
 * en enlaces `?tab=`) y DirectoraView (que lee el mismo query param para
 * decidir que contenido mostrar). Vivir en un solo sitio evita que ambos se
 * desincronicen.
 */
export const DIRECTORA_TABS = [
  { id: 'alumnos', label: 'Alumnos', emoji: '👶' },
  { id: 'salas', label: 'Salas', emoji: '🎨' },
  { id: 'niveles', label: 'Niveles', emoji: '📚' },
  { id: 'profesoras', label: 'Profesoras', emoji: '👩‍🏫' },
  { id: 'pagos', label: 'Pagos', emoji: '💳' },
  { id: 'cuentas', label: 'Cuentas', emoji: '🔑' },
] as const;

export type DirectoraTabId = (typeof DIRECTORA_TABS)[number]['id'];

export const DEFAULT_DIRECTORA_TAB: DirectoraTabId = 'alumnos';

export function isDirectoraTabId(value: string | null): value is DirectoraTabId {
  return DIRECTORA_TABS.some((t) => t.id === value);
}
