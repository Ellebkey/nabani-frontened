// Domain models for the Catálogos section (design-spec §4.17–§4.19, §7).
import type { PillVariant } from '@shared/components/pill/pill.component';

export type FoodGroupKey = 'verdura' | 'fruta' | 'cereal' | 'lacteo' | 'condimento' | 'otros';

export interface IDisease {
  id: number;
  key: string;
  name: string;
}

export interface IIngredient {
  id: number;
  name: string;
  foodGroup: string;
  baseUnit: string;
  baseQuantity: number;
  lastPrice: number | null;
  active: boolean;
  diseases?: IDisease[];
}

export interface IngredientDTO {
  name: string;
  foodGroup: string;
  baseUnit: string;
  baseQuantity: number;
  lastPrice?: number | null;
  diseaseIds: number[];
}

export type EmployeePosition = 'nutriologa' | 'admin' | 'cocina' | 'front_desk' | 'reparto';

export interface IEmployee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  position: EmployeePosition | string;
  salaryQuincenal: number;
  lastPaymentDate: string | null;
  active: boolean;
}

export interface EmployeeDTO {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  salaryQuincenal: number;
  lastPaymentDate?: string | null;
}

// GET /employees carries a payroll total alongside the paged rows.
export interface EmployeesList {
  rows: IEmployee[];
  count: number;
  payrollTotal: number;
}

export interface IUser {
  id: number;
  username: string;
  email: string;
  fullname: string;
  roles?: string[];
}

export interface UserDTO {
  username: string;
  email: string;
  fullname: string;
  roles: string[];
  password?: string;
}

// ---- Food-group presentation (design-spec §1.3) ---------------------------
// Colors are runtime CSS vars so they flip in dark mode; passing them as the
// pill's `--pc` lets the tint color-mix resolve correctly.
export interface FoodGroupMeta {
  key: FoodGroupKey;
  label: string;
  color: string;
}

export const FOOD_GROUPS: FoodGroupMeta[] = [
  { key: 'verdura', label: 'Verdura', color: 'rgb(var(--maguey-food-verdura))' },
  { key: 'fruta', label: 'Fruta', color: 'rgb(var(--maguey-food-fruta))' },
  { key: 'cereal', label: 'Cereal', color: 'rgb(var(--maguey-food-cereal))' },
  { key: 'lacteo', label: 'Lácteo', color: 'rgb(var(--maguey-food-lacteo))' },
  { key: 'condimento', label: 'Condimento', color: 'rgb(var(--maguey-food-condimento))' },
  { key: 'otros', label: 'Otros', color: 'rgb(var(--maguey-food-otros))' },
];

const FOOD_GROUP_BY_KEY = new Map<string, FoodGroupMeta>(FOOD_GROUPS.map(g => [g.key, g]));

/** Normalizes any backend food-group value (Spanish label, accented, or key)
 *  to one of the six canonical group metas; falls back to "Otros". */
export function foodGroupMeta(value: string | null | undefined): FoodGroupMeta {
  const normalized = (value ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // strip accents (lácteo → lacteo)
  return FOOD_GROUP_BY_KEY.get(normalized) ?? FOOD_GROUP_BY_KEY.get('otros')!;
}

// ---- Employee position presentation (design-spec §4.18) -------------------
export interface PositionMeta {
  label: string;
  variant: PillVariant;
}

const POSITION_META: Record<string, PositionMeta> = {
  nutriologa: { label: 'Nutrióloga', variant: 'teal' },
  admin: { label: 'Admin', variant: 'brand' },
  cocina: { label: 'Cocina', variant: 'neutral' },
  front_desk: { label: 'Front desk', variant: 'neutral' },
  reparto: { label: 'Reparto', variant: 'neutral' },
};

export function positionMeta(value: string | null | undefined): PositionMeta {
  const key = (value ?? '').toString().trim().toLowerCase();
  return POSITION_META[key] ?? { label: value ? titleCase(value) : '—', variant: 'neutral' };
}

export const POSITION_OPTIONS = [
  { value: 'nutriologa', label: 'Nutrióloga' },
  { value: 'admin', label: 'Admin' },
  { value: 'cocina', label: 'Cocina' },
  { value: 'front_desk', label: 'Front desk' },
  { value: 'reparto', label: 'Reparto' },
];

// ---- User role presentation (design-spec §4.19) ---------------------------
export function roleMeta(role: string): PositionMeta {
  const key = (role ?? '').toString().trim().toLowerCase();
  if (key === 'admin') return { label: 'Admin', variant: 'brand' };
  if (key === 'nutriologa') return { label: 'Nutrióloga', variant: 'teal' };
  return { label: titleCase(role), variant: 'neutral' };
}

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'nutriologa', label: 'Nutrióloga' },
  { value: 'cocina', label: 'Cocina' },
];

export const BASE_UNIT_OPTIONS = [
  { value: 'gr', label: 'gr' },
  { value: 'ml', label: 'ml' },
  { value: 'pzas', label: 'pzas' },
  { value: 'kcal', label: 'kcal' },
];

function titleCase(value: string): string {
  return value
    .toString()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
