import { MagueyNavigationItem } from '@maguey/components/navigation';

/**
 * Nabani sidebar — the 6 sections (design-spec §3). Rendered in the 92px brand
 * sidebar as icon + short label. `Finanzas` and `Catálogos` are admin-only and are
 * filtered out for non-admins (incl. nutrióloga) by NavigationService.
 *
 * Section → default screen (route):
 *   Hoy → /hoy · Planeación → /planeacion · Producción → /produccion
 *   Pacientes → /pacientes · Finanzas → /finanzas · Catálogos → /catalogos
 */
export const menu: MagueyNavigationItem[] = [
  { id: 'hoy',        title: 'Hoy',        type: 'basic', icon: 'heroicons_outline:home',            link: '/hoy' },
  { id: 'planeacion', title: 'Planeación', type: 'basic', icon: 'heroicons_outline:calendar-days',   link: '/planeacion' },
  { id: 'produccion', title: 'Producción', type: 'basic', icon: 'heroicons_outline:fire',            link: '/produccion' },
  { id: 'pacientes',  title: 'Pacientes',  type: 'basic', icon: 'heroicons_outline:users',           link: '/pacientes' },
  { id: 'finanzas',   title: 'Finanzas',   type: 'basic', icon: 'heroicons_outline:currency-dollar', link: '/finanzas' },
  { id: 'catalogos',  title: 'Catálogos',  type: 'basic', icon: 'heroicons_outline:squares-2x2',     link: '/catalogos' },
];

/** Ids that only admins may see in the sidebar (nutrióloga & other roles hidden). */
export const ADMIN_ONLY_SECTIONS: ReadonlySet<string> = new Set(['finanzas', 'catalogos']);
