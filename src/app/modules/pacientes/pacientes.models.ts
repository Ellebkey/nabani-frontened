// Domain models for the Pacientes section (design-spec §4.10–§4.11, §5, §7).
import type { PillVariant } from '@shared/components/pill/pill.component';

export interface ICalorieLevel {
  id: number;
  kcal: number;
  label: string;
}

export interface IAddress {
  street?: string | null;
  numberExt?: string | null;
  neighborhood?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface INutritionPlan {
  calorieLevelId?: number | null;
  verduras?: number | null;
  frutas?: number | null;
  cereales?: number | null;
  lacteos?: number | null;
  pDesayuno?: number | null;
  pComida?: number | null;
  pCena?: number | null;
  aceites?: number | null;
  semillas?: number | null;
  comments?: string | null;
}

export interface IDisease {
  id: number;
  key?: string;
  name: string;
}

export interface IPreference {
  id: number;
  name: string;
}

export interface IPatient {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  cellphone?: string | null;
  gender?: string | null;
  week?: string | null;
  zone?: string | null;
  tuppers?: boolean;
  status: string;
  calorieLevel?: ICalorieLevel | null;
  nutriologaId?: number | null;
  createdAt?: string;
  // detail-only (GET /patients/:id)
  birthday?: string | null;
  address?: IAddress | null;
  nutritionPlan?: INutritionPlan | null;
  diseases?: IDisease[];
  preferences?: IPreference[];
  otherFood?: string | null;
  otherDiseases?: string | null;
  otherPreferences?: string | null;
  // optional derived / enriched (degrade gracefully when absent)
  packageName?: string | null;
  packageCode?: string | null;
  mealCodes?: string[];
  billing?: string | null;
  pricePerDay?: number | null;
  startDate?: string | null;
  lastDay?: string | null;
  balanceDue?: number | null;
}

export interface PatientDTO {
  firstName: string;
  lastName: string;
  email?: string | null;
  cellphone?: string | null;
  gender?: string | null;
  birthday?: string | null;
  week?: string | null;
  zone?: string | null;
  tuppers?: boolean;
  otherFood?: string | null;
  otherDiseases?: string | null;
  otherPreferences?: string | null;
  calorieLevelId?: number | null;
  nutriologaId?: number | null;
  address?: IAddress;
  nutritionPlan?: INutritionPlan;
  diseaseIds?: number[];
  preferenceIngredientIds?: number[];
  // Initial evaluation (design-spec §5 "Evaluación inicial"); nested to keep the
  // documented body shape clean — backend may persist as the first consultation.
  evaluation?: Record<string, number | null>;
}

export interface IConsultation {
  id: number;
  consultDate: string;
  type?: string | null;
  price?: number | null;
  weight?: number | null;
  bodyFat?: number | null;
  muscle?: number | null;
  water?: number | null;
  arm?: number | null;
  waist?: number | null;
  abdomen?: number | null;
  hip?: number | null;
  objetivoKcal?: number | null;
  notes?: string | null;
}

export interface ConsultationDTO {
  consultDate: string;
  type?: string | null;
  price?: number | null;
  weight?: number | null;
  bodyFat?: number | null;
  muscle?: number | null;
  water?: number | null;
  arm?: number | null;
  waist?: number | null;
  abdomen?: number | null;
  hip?: number | null;
  objetivoKcal?: number | null;
  notes?: string | null;
}

export interface ICalendarDay {
  id: number;
  deliveryDate: string;
  amount?: number | null;
  type?: string | null;
  hasMenu?: boolean;
  authorized?: boolean;
  paymentId?: number | null;
}

export interface IPayment {
  id: number;
  folio?: string | null;
  saleId?: number | null;
  dueDate?: string | null;
  amount: number;
  method?: string | null;
  paid: boolean;
  paidAt?: string | null;
  note?: string | null;
  agingDays?: number | null;
}

export interface PaymentUpdateDTO {
  paid: boolean;
  method?: string | null;
  note?: string | null;
}

export interface IPackage {
  id: number;
  name: string;
  code?: string | null;
  pricePerDay?: number | null;
  billing?: string | null;
  meals?: string[];
  consultaPrice?: number | null;
}

export interface IIngredientOption {
  id: number;
  name: string;
}

export interface SaleCalcDTO {
  patientId: number;
  packageId: number;
  startDate: string;
  days: number;
  billing: string;
}

export interface SaleCalcResult {
  pricing?: {
    subTotal?: number;
    discountReason?: string;
    discountPercent?: number;
    discountAmount?: number;
    total?: number;
    installmentCount?: number;
    perDayAmount?: number;
  };
  sale?: Record<string, unknown>;
}

// ---- Presentation constants (design-spec §5, §7) --------------------------

export interface RationMeta {
  key: keyof INutritionPlan;
  label: string;
}

export const RATIONS: RationMeta[] = [
  { key: 'verduras', label: 'Verduras' },
  { key: 'frutas', label: 'Frutas' },
  { key: 'cereales', label: 'Cereales' },
  { key: 'lacteos', label: 'Lácteos' },
  { key: 'pDesayuno', label: 'P. Desayuno' },
  { key: 'pComida', label: 'P. Comida' },
  { key: 'pCena', label: 'P. Cena' },
  { key: 'aceites', label: 'Aceites' },
  { key: 'semillas', label: 'Semillas' },
];

export interface MedicionMeta {
  key: keyof IConsultation;
  label: string;
  unit: string;
}

// Eight body measurements captured per consultation (design-spec §5 "consulta").
export const MEDICIONES: MedicionMeta[] = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'bodyFat', label: 'Grasa', unit: '%' },
  { key: 'muscle', label: 'Músculo', unit: '%' },
  { key: 'water', label: 'Agua', unit: '%' },
  { key: 'arm', label: 'Brazo', unit: 'cm' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'abdomen', label: 'Abdomen', unit: 'cm' },
  { key: 'hip', label: 'Cadera', unit: 'cm' },
];

// Mediciones table columns (design-spec §4.11 Historial clínico) — 7 metrics + fecha.
export const MEDICION_COLUMNS: MedicionMeta[] = [
  { key: 'bodyFat', label: 'Grasa', unit: '%' },
  { key: 'muscle', label: 'Músculo', unit: '%' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'abdomen', label: 'Abdomen', unit: 'cm' },
  { key: 'hip', label: 'Cadera', unit: 'cm' },
  { key: 'arm', label: 'Brazo', unit: 'cm' },
];

// Initial-evaluation fields (design-spec §5 Nuevo paciente).
export const EVALUATION_FIELDS = [
  { key: 'weight', label: 'Peso' },
  { key: 'height', label: 'Estatura' },
  { key: 'age', label: 'Edad' },
  { key: 'bodyFat', label: 'Grasa' },
  { key: 'arm', label: 'Brazo' },
  { key: 'highWaist', label: 'Cintura alta' },
  { key: 'abdomen', label: 'Abdomen' },
  { key: 'hip', label: 'Cadera' },
];

export const WEEK_OPTIONS = [
  { value: 'LV', label: 'Lunes a Viernes' },
  { value: 'LS', label: 'Lunes a Sábado' },
  { value: 'LD', label: 'Lunes a Domingo' },
];

const WEEK_BY_VALUE = new Map(WEEK_OPTIONS.map(w => [w.value, w.label]));

export function weekLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return WEEK_BY_VALUE.get(value) ?? value;
}

export const GENDER_OPTIONS = [
  { value: 'femenino', label: 'Femenino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'otro', label: 'Otro' },
];

export const BILLING_OPTIONS = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'diario', label: 'Diario' },
];

const BILLING_BY_VALUE = new Map(BILLING_OPTIONS.map(b => [b.value, b.label]));

export function billingLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return BILLING_BY_VALUE.get(value.toString().toLowerCase()) ?? value;
}

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

const METHOD_BY_VALUE = new Map(PAYMENT_METHOD_OPTIONS.map(m => [m.value, m.label]));

export function methodLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return METHOD_BY_VALUE.get(value.toString().toLowerCase()) ?? value;
}

// Meal codes (design-spec §4.16): D/S1/C/S2/Ce.
export const MEAL_CODES = [
  { code: 'D', label: 'Desayuno' },
  { code: 'S1', label: 'Colación 1' },
  { code: 'C', label: 'Comida' },
  { code: 'S2', label: 'Colación 2' },
  { code: 'Ce', label: 'Cena' },
];

const MEAL_LABEL_BY_CODE = new Map(MEAL_CODES.map(m => [m.code, m.label]));

export function mealLabel(code: string): string {
  return MEAL_LABEL_BY_CODE.get(code) ?? code;
}

export function fullName(patient: Pick<IPatient, 'firstName' | 'lastName'>): string {
  return `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim();
}

// Patient status pill (design-spec §2.4).
export function statusMeta(status: string | null | undefined): { label: string; variant: PillVariant } {
  const key = (status ?? '').toString().trim().toLowerCase();
  if (key === 'activo') return { label: 'Activo', variant: 'teal' };
  if (key === 'inactivo') return { label: 'Inactivo', variant: 'neutral' };
  return { label: status ?? '—', variant: 'neutral' };
}

export type PatientFilter = 'activos' | 'inactivos' | 'porVencer';
