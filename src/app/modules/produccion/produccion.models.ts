// Domain models for the Producción section (design-spec §4.6–§4.9, §7).
// Data comes from four derived, read-only endpoints keyed by `?date=`.
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Meal slots (design-spec §4.16). Backend sends a slug; the UI needs the
// Spanish label and the short code shown on tiles (D/S1/C/S2/Ce).
// ---------------------------------------------------------------------------
export interface MealSlotMeta {
  slug: string;
  label: string;
  code: string;
}

const MEAL_SLOT_META: Record<string, MealSlotMeta> = {
  desayuno: { slug: 'desayuno', label: 'Desayuno', code: 'D' },
  snack1: { slug: 'snack1', label: 'Snack 1', code: 'S1' },
  colacion1: { slug: 'colacion1', label: 'Colación 1', code: 'S1' },
  comida: { slug: 'comida', label: 'Comida', code: 'C' },
  snack2: { slug: 'snack2', label: 'Snack 2', code: 'S2' },
  colacion2: { slug: 'colacion2', label: 'Colación 2', code: 'S2' },
  cena: { slug: 'cena', label: 'Cena', code: 'Ce' },
};

export function mealSlotMeta(slug: string | null | undefined): MealSlotMeta {
  const key = (slug ?? '').toString().trim().toLowerCase();
  return MEAL_SLOT_META[key] ?? { slug: key, label: key ? titleCase(key) : '—', code: key ? key[0].toUpperCase() : '?' };
}

export function mealSlotLabel(slug: string | null | undefined): string {
  return mealSlotMeta(slug).label;
}

// ---------------------------------------------------------------------------
// Food-group presentation (design-spec §1.3) — module-local copy so Producción
// stays self-contained. Colors are runtime CSS vars so they flip in dark mode.
// ---------------------------------------------------------------------------
export interface FoodGroupMeta {
  key: string;
  label: string;
  color: string;
}

const FOOD_GROUPS: FoodGroupMeta[] = [
  { key: 'verdura', label: 'Verdura', color: 'rgb(var(--maguey-food-verdura))' },
  { key: 'fruta', label: 'Fruta', color: 'rgb(var(--maguey-food-fruta))' },
  { key: 'cereal', label: 'Cereal', color: 'rgb(var(--maguey-food-cereal))' },
  { key: 'lacteo', label: 'Lácteo', color: 'rgb(var(--maguey-food-lacteo))' },
  { key: 'condimento', label: 'Condimento', color: 'rgb(var(--maguey-food-condimento))' },
  { key: 'otros', label: 'Otros', color: 'rgb(var(--maguey-food-otros))' },
];

const FOOD_GROUP_BY_KEY = new Map<string, FoodGroupMeta>(FOOD_GROUPS.map(g => [g.key, g]));

/** Normalizes any backend food-group value (label, accented, or key) to one of
 *  the six canonical group metas; falls back to "Otros". */
export function foodGroupMeta(value: string | null | undefined): FoodGroupMeta {
  const normalized = (value ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // strip accents (lácteo → lacteo)
  return FOOD_GROUP_BY_KEY.get(normalized) ?? FOOD_GROUP_BY_KEY.get('otros')!;
}

// ---------------------------------------------------------------------------
// Mapa de producción (design-spec §4.6) ★
// ---------------------------------------------------------------------------
export interface MapColumn {
  key: string;
  mealSlot: string;
  dishId: number;
  dishName: string;
  ingredientId: number;
  ingredientName: string;
  foodGroup: string;
  baseQuantity: number;
  unit: string;
}

export interface MapMealGroupDish {
  dishId: number;
  dishName: string;
  columns: MapColumn[];
}

export interface MapMealGroup {
  mealSlot: string;
  dishes: MapMealGroupDish[];
}

export interface MapCell {
  portions: number;
  eliminated?: boolean;
  substituted?: boolean;
  substituteId?: number;
  substituteName?: string;
}

export interface MapPatientRef {
  firstName: string;
  lastName: string;
}

export interface MapRow {
  deliveryDayId: number;
  patient: MapPatientRef;
  kcal: number;
  calorieLabel: string;
  authorized: boolean;
  // A missing key = blank cell (meal not in that patient's package).
  cells: Record<string, MapCell | undefined>;
}

export interface MapKitchenTotal {
  ingredientId: number;
  name: string;
  foodGroup: string;
  baseUnit: string;
  baseQuantity: number;
  portions: number;
}

export interface ProductionMap {
  date: string;
  columns: MapColumn[];
  mealGroups: MapMealGroup[];
  rows: MapRow[];
  totalsForKitchen: MapKitchenTotal[];
  patientCount: number;
}

/** Canonical cell key: `${mealSlot}::${dishId}::${ingredientId}` (design-spec §4.6). */
export function mapColumnKey(mealSlot: string, dishId: number, ingredientId: number): string {
  return `${mealSlot}::${dishId}::${ingredientId}`;
}

/** Flat, ordered column list enriched with a `gsep` flag (first column of each
 *  meal group). Keys are recomputed so body lookups always match the documented
 *  cell key format, independent of what the payload nests. */
export interface MapColumnView extends MapColumn {
  gsep: boolean;
}

export function buildMapColumns(mealGroups: MapMealGroup[] | null | undefined): MapColumnView[] {
  const out: MapColumnView[] = [];
  for (const group of mealGroups ?? []) {
    let first = true;
    for (const dish of group.dishes ?? []) {
      for (const col of dish.columns ?? []) {
        out.push({
          ...col,
          key: mapColumnKey(group.mealSlot, dish.dishId, col.ingredientId),
          mealSlot: group.mealSlot,
          dishId: dish.dishId,
          dishName: dish.dishName,
          gsep: first,
        });
        first = false;
      }
    }
  }
  return out;
}

/** Header row-1 group cells: one colspan cell per dish (design-spec §4.6). */
export interface MapHeaderDish {
  label: string;
  colspan: number;
}

export function buildHeaderDishes(mealGroups: MapMealGroup[] | null | undefined): MapHeaderDish[] {
  const out: MapHeaderDish[] = [];
  for (const group of mealGroups ?? []) {
    for (const dish of group.dishes ?? []) {
      const colspan = dish.columns?.length ?? 0;
      if (colspan > 0) {
        out.push({ label: `${mealSlotLabel(group.mealSlot)} · ${dish.dishName}`, colspan });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Etiquetas de entrega (design-spec §4.7)
// ---------------------------------------------------------------------------
export interface LabelIngredient {
  name: string;
  portions: number;
  substituted?: boolean;
  substitutedFromName?: string;
  eliminated?: boolean;
}

export interface LabelMeal {
  mealSlot: string;
  dishName: string;
  ingredients: LabelIngredient[];
}

export interface LabelSubstitution {
  mealSlot: string;
  from: string;
  to: string;
}

export interface DeliveryLabelRow {
  deliveryDayId: number;
  patient: MapPatientRef;
  zone: string;
  tuppers: number;
  calorieLabel: string;
  meals: LabelMeal[];
  substitutions: LabelSubstitution[];
  freeBeverages: string;
}

export interface DeliveryLabels {
  rows: DeliveryLabelRow[];
}

// ---------------------------------------------------------------------------
// Vista cocina (design-spec §4.8)
// ---------------------------------------------------------------------------
export interface KitchenIngredient {
  ingredientId: number;
  name: string;
  baseQuantity: number;
  unit: string;
  totalPortions: number;
}

export interface KitchenDish {
  dishId: number;
  dishName: string;
  patientCount: number;
  ingredients: KitchenIngredient[];
}

export type KitchenExceptionType = 'substitution' | 'elimination';

export interface KitchenException {
  patientName: string;
  type: KitchenExceptionType;
  ingredientName: string;
  substituteName?: string;
  dishName: string;
}

export interface KitchenSlot {
  mealSlot: string;
  dishes: KitchenDish[];
  exceptions: KitchenException[];
}

export interface KitchenView {
  slots: KitchenSlot[];
}

/** One dish = one card (design-spec §4.8); exceptions filtered to the dish. */
export interface KitchenCard {
  key: string;
  title: string;
  patientCount: number;
  ingredients: KitchenIngredient[];
  exceptions: KitchenException[];
}

export function buildKitchenCards(slots: KitchenSlot[] | null | undefined): KitchenCard[] {
  const out: KitchenCard[] = [];
  for (const slot of slots ?? []) {
    for (const dish of slot.dishes ?? []) {
      const exceptions = (slot.exceptions ?? []).filter(e => e.dishName === dish.dishName);
      out.push({
        key: `${slot.mealSlot}-${dish.dishId}`,
        title: `${mealSlotLabel(slot.mealSlot)} · ${dish.dishName}`,
        patientCount: dish.patientCount,
        ingredients: dish.ingredients ?? [],
        exceptions,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Compras y costos (design-spec §4.9) ★
// ---------------------------------------------------------------------------
export type QuantityUnit = 'kg' | 'l' | 'pzas';

export interface ShoppingItem {
  ingredientId: number;
  name: string;
  foodGroup: string;
  portions: number;
  baseQuantity: number;
  unit: string;
  quantity: number;
  quantityUnit: QuantityUnit | string;
  lastPrice: number;
  cost: number;
}

export interface ShoppingGroup {
  foodGroup: string;
  items: ShoppingItem[];
  subtotal: number;
}

export interface CostPerDish {
  dishId: number;
  dishName: string;
  portions: number;
  totalCost: number;
  costPerPortion: number;
}

export interface MarginPerPackage {
  packageId: number;
  code: string;
  displayLabel: string;
  pricePerDay: number;
  deliveries: number;
  costPerDay: number;
  margin: number;
  marginPercent: number;
  alert: boolean;
}

export interface ShoppingList {
  startDate: string;
  endDate: string;
  groups: ShoppingGroup[];
  estimated: number;
  costPerDish: CostPerDish[];
  marginPerPackage: MarginPerPackage[];
}

// ---------------------------------------------------------------------------
// Date helpers (Spanish es-MX; the API param is always `yyyy-MM-dd`).
// ---------------------------------------------------------------------------
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** "sábado 4 jul 2026" — the long, human date used in pageheads. */
export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  try {
    return format(parseISO(iso), 'EEEE d MMM yyyy', { locale: es });
  } catch {
    return iso;
  }
}

function titleCase(value: string): string {
  return value
    .toString()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
