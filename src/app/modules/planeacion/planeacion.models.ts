// Domain models for the Planeación section (design-spec §4.2–§4.5, §5, §7, §8).
import { format, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PillVariant } from '@shared/components/pill/pill.component';

// ---- Calorie levels (dynamic Menú-del-día columns, §4.3) ------------------
export interface ICalorieLevel {
  id: number;
  kcal: number;
  label?: string | null;
}

// ---- Semana (§4.2) --------------------------------------------------------
export type WeekDayStatus = 'completo' | 'ajustes' | 'borrador';

export interface IWeekMealName {
  mealSlot: string;
  dishName: string | null;
}

export interface IWeekDay {
  date: string;
  deliveries: number;
  menuStatus: string;
  conflictCount: number;
  status: WeekDayStatus;
  // Enriched client-side from GET /menu-days (meal dish names per slot).
  meals?: IWeekMealName[];
}

export interface IWeekResponse {
  startDate: string;
  endDate: string;
  days: IWeekDay[];
}

// GET /menu-days list — used to resolve per-slot dish names for the week strip.
export interface IMenuDaySummaryMeal {
  mealSlot: string;
  dishName?: string | null;
  dish?: { name?: string | null } | null;
}

export interface IMenuDaySummary {
  id: number;
  menuDate: string;
  status: string;
  meals: IMenuDaySummaryMeal[];
}

// ---- Menú del día (§4.3) --------------------------------------------------
export interface IPortion {
  calorieLevelId: number;
  calorieLevel?: { kcal: number } | null;
  portions: number | null;
}

export interface IMenuIngredient {
  id: number;
  ingredientId: number;
  ingredient: { name: string; baseUnit: string };
  baseQuantity: number | null;
  unit: string;
  position: number;
  portions: IPortion[];
}

export interface IMenuDish {
  id: number;
  name: string;
  mealTime?: string | null;
  ingredients: IMenuIngredient[];
}

export interface IMenuMeal {
  mealSlot: string;
  dishId: number | null;
  dish: IMenuDish | null;
}

export interface IMenuDay {
  id: number;
  menuDate: string;
  status: string;
  meals: IMenuMeal[];
}

// Save payloads — the per-level portions live on the dish (PUT /dishes/:id).
export interface DishPortionDTO {
  calorieLevelId: number;
  portions: number;
}

export interface DishIngredientDTO {
  ingredientId: number;
  baseQuantity: number;
  unit: string;
  position: number;
  portions: DishPortionDTO[];
}

export interface DishDTO {
  name: string;
  mealTime: string;
  ingredients: DishIngredientDTO[];
}

// PUT /menu-days/:id — assign/replace which dish sits in each meal slot.
export interface MenuDayAssignMeal {
  mealSlot: string;
  dishId: number | null;
  position: number;
}

export interface MenuDayAssignDTO {
  meals: MenuDayAssignMeal[];
}

// ---- Pickers (§4.3 / §4.5) ------------------------------------------------
export interface IDishOption {
  id: number;
  name: string;
  mealTime: string;
  usageCount?: number | null;
  ingredients?: IMenuIngredient[];
}

export interface IIngredientOption {
  id: number;
  name: string;
  foodGroup?: string | null;
  baseUnit?: string | null;
  baseQuantity?: number | null;
}

// ---- Ajustes por paciente (§4.4) ------------------------------------------
export type AdjustmentFilter = 'todos' | 'conflictos' | 'listos';
export type AdjustmentRowStatus = 'listo' | 'conflicto';

export interface IAdjustmentPatientRef {
  id: number;
  firstName: string;
  lastName: string;
}

export interface IAdjustmentRow {
  deliveryDayId: number;
  patient: IAdjustmentPatientRef;
  calorieLevel: { kcal: number } | null;
  package: { code: string } | null;
  hasMenu: boolean;
  authorized: boolean;
  conflictCount: number;
  preferenceConflictCount: number;
  diseaseConflictCount: number;
  status: AdjustmentRowStatus;
}

export interface IAdjustmentsSummary {
  total: number;
  listos: number;
  conflictos: number;
}

export interface IAdjustmentsResponse {
  date: string;
  rows: IAdjustmentRow[];
  count: number;
  summary: IAdjustmentsSummary;
}

export type ConflictType = 'preference' | 'disease' | null;

export interface IAdjustmentIngredient {
  id: number;
  name: string;
  portions: number | null;
  conflictType: ConflictType;
  substitutedFrom: string | null;
  eliminated: boolean;
  quantity?: number | null;
  unit?: string | null;
}

export interface IAdjustmentMeal {
  mealSlot: string;
  dishName: string | null;
  ingredients: IAdjustmentIngredient[];
}

export interface IAdjustmentNamedRef {
  id?: number;
  name: string;
}

export interface IAdjustmentDetail {
  patient: IAdjustmentPatientRef;
  calorieLevel: { kcal: number } | null;
  package: { code: string } | null;
  meals: IAdjustmentMeal[];
  diseases: IAdjustmentNamedRef[];
  preferences: IAdjustmentNamedRef[];
}

export interface ISwapSuggestion {
  ingredientId: number;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  foodGroup?: string | null;
  portions?: number | null;
  flag?: string | null;
}

// ---- Meal-slot presentation (§4.3 / §4.16) --------------------------------
export interface MealSlotMeta {
  slot: string;
  label: string;
  code: string;
}

export const MEAL_SLOTS: MealSlotMeta[] = [
  { slot: 'desayuno', label: 'Desayuno', code: 'D' },
  { slot: 'colacion1', label: 'Colación 1', code: 'S1' },
  { slot: 'comida', label: 'Comida', code: 'C' },
  { slot: 'colacion2', label: 'Colación 2', code: 'S2' },
  { slot: 'cena', label: 'Cena', code: 'Ce' },
];

const MEAL_SLOT_ALIASES: Record<string, string> = {
  desayuno: 'desayuno',
  breakfast: 'desayuno',
  colacion1: 'colacion1',
  colacion_1: 'colacion1',
  snack1: 'colacion1',
  snack_1: 'colacion1',
  comida: 'comida',
  lunch: 'comida',
  colacion2: 'colacion2',
  colacion_2: 'colacion2',
  snack2: 'colacion2',
  snack_2: 'colacion2',
  cena: 'cena',
  dinner: 'cena',
};

const MEAL_SLOT_BY_KEY = new Map(MEAL_SLOTS.map(m => [m.slot, m]));

/** Normalizes any backend mealSlot value to one of the five canonical slots. */
export function normalizeMealSlot(value: string | null | undefined): string {
  const key = (value ?? '').toString().trim().toLowerCase();
  return MEAL_SLOT_ALIASES[key] ?? key;
}

export function mealSlotMeta(value: string | null | undefined): MealSlotMeta {
  const slot = normalizeMealSlot(value);
  return MEAL_SLOT_BY_KEY.get(slot) ?? { slot, label: value ? String(value) : '—', code: '·' };
}

/** Default dish meal-time for a menu slot (dishes group snacks under "snack"). */
export function slotToMealTime(slot: string): string {
  const map: Record<string, string> = {
    desayuno: 'desayuno',
    colacion1: 'snack',
    comida: 'comida',
    colacion2: 'snack',
    cena: 'cena',
  };
  return map[normalizeMealSlot(slot)] ?? 'comida';
}

// ---- Meal-time presentation (dishes / Biblioteca §4.5) --------------------
export const MEAL_TIME_OPTIONS: { value: string; label: string }[] = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'snack', label: 'Snack' },
  { value: 'comida', label: 'Comida' },
  { value: 'cena', label: 'Cena' },
];

const MEAL_TIME_LABELS = new Map(MEAL_TIME_OPTIONS.map(o => [o.value, o.label]));

export function mealTimeLabel(value: string | null | undefined): string {
  const key = (value ?? '').toString().trim().toLowerCase();
  return MEAL_TIME_LABELS.get(key) ?? (value ? String(value) : '—');
}

// ---- Status pills ---------------------------------------------------------
export interface PillMeta {
  label: string;
  variant: PillVariant;
}

// Day-card status (§4.2): teal Completo / amber Sin porciones / neutral Borrador.
export function weekStatusMeta(status: WeekDayStatus | string): PillMeta {
  const key = (status ?? '').toString().trim().toLowerCase();
  if (key === 'completo') return { label: 'Completo', variant: 'teal' };
  if (key === 'ajustes') return { label: 'Sin porciones', variant: 'amber' };
  return { label: 'Borrador', variant: 'neutral' };
}

// ---- Date helpers (es-MX; parseISO avoids the UTC-6 day shift) ------------
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Shift a YYYY-MM-DD string by N days, returning YYYY-MM-DD. */
export function shiftIso(iso: string, days: number): string {
  return format(addDays(parseISO(iso), days), 'yyyy-MM-dd');
}

/** "miércoles 8 jul" */
export function formatLongDate(iso: string): string {
  return format(parseISO(iso), "EEEE d MMM", { locale: es });
}

/** "Lunes 6" — capitalized weekday + day for the week grid cards. */
export function formatDayCard(iso: string): string {
  const label = format(parseISO(iso), 'EEEE d', { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "6 – 12 jul" — compact week range for the pager. */
export function weekRangeLabel(startIso: string, endIso: string): string {
  const start = format(parseISO(startIso), 'd', { locale: es });
  const end = format(parseISO(endIso), 'd MMM', { locale: es });
  return `${start} – ${end}`;
}
