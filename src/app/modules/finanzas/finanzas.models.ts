// Domain models for the Finanzas section (design-spec §4.12–§4.16, §5, §7).
import type { PillVariant } from '@shared/components/pill/pill.component';

// ---- Cobranza (design-spec §4.12) -----------------------------------------
export interface IPatientRef {
  id: number;
  firstName: string;
  lastName: string;
}

export interface IPayment {
  id: number;
  folio: string;
  saleId: number;
  patientId: number;
  dueDate: string;
  amount: number;
  method: string | null;
  paid: boolean;
  agingDays: number;
  patient?: IPatientRef;
}

export interface PaymentsList {
  rows: IPayment[];
  count: number;
}

export interface PaymentUpdateDTO {
  paid: boolean;
  method: string;
  note?: string | null;
}

export function paymentPatientName(payment: IPayment): string {
  const patient = payment.patient;
  if (!patient) {
    return `Paciente #${payment.patientId}`;
  }
  return `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() || `Paciente #${payment.patientId}`;
}

// Antigüedad pill (design-spec §4.12): rose ≥30d overdue, amber <30d overdue,
// amber "Vence hoy" at the boundary, teal upcoming.
export interface AgingMeta {
  variant: PillVariant;
  label: string;
}

export function agingMeta(agingDays: number): AgingMeta {
  if (agingDays >= 30) {
    return { variant: 'rose', label: `Vencido · ${agingDays} días` };
  }
  if (agingDays > 0) {
    return { variant: 'amber', label: `Vencido · ${agingDays} día${agingDays === 1 ? '' : 's'}` };
  }
  if (agingDays === 0) {
    return { variant: 'amber', label: 'Vence hoy' };
  }
  const days = Math.abs(agingDays);
  return { variant: 'teal', label: `En ${days} día${days === 1 ? '' : 's'}` };
}

export const PAYMENT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

const PAYMENT_METHOD_LABELS = new Map<string, string>(
  PAYMENT_METHOD_OPTIONS.map(o => [o.value, o.label]),
);

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) {
    return '—';
  }
  return PAYMENT_METHOD_LABELS.get(method.toLowerCase()) ?? titleCase(method);
}

// ---- Ingresos Diarios (design-spec §4.13) ---------------------------------
export interface IDailyIncomeItem {
  deliveryDayId: number;
  patientName: string;
  packageLabel: string;
  type: string;
  amount: number;
}

export interface IDailyIncomeDay {
  date: string;
  total: number;
  items: IDailyIncomeItem[];
}

export interface IDailyIncomes {
  startDate: string;
  endDate: string;
  days: IDailyIncomeDay[];
  grandTotal: number;
}

// ---- Gastos (design-spec §4.14, §5) ---------------------------------------
export interface IBeneficiary {
  id: number;
  name: string;
}

export interface IExpense {
  id: number;
  folio: string;
  concept: string;
  beneficiary?: IBeneficiary | null;
  totalAmount: number;
  expenseDate: string;
  type: string;
  comments?: string | null;
}

export interface ExpensesList {
  rows: IExpense[];
  count: number;
  total: number;
}

export interface ExpenseDTO {
  beneficiary?: string | null;
  concept: string;
  totalAmount: number;
  expenseDate: string;
  type: string;
  comments?: string | null;
}

export type ExpenseType = 'fijo' | 'variable';

export interface ExpenseTypeMeta {
  label: string;
  variant: PillVariant;
}

export function expenseTypeMeta(type: string | null | undefined): ExpenseTypeMeta {
  return (type ?? '').toLowerCase() === 'fijo'
    ? { label: 'Fijo', variant: 'brand' }
    : { label: 'Variable', variant: 'neutral' };
}

export const EXPENSE_TYPE_OPTIONS: { value: ExpenseType; label: string }[] = [
  { value: 'variable', label: 'Variable' },
  { value: 'fijo', label: 'Fijo' },
];

// ---- Balance General (design-spec §4.15) ----------------------------------
export interface IPackageIncome {
  packageId: number;
  code: string;
  displayLabel: string;
  total: number;
  deliveries: number;
}

export interface IBalance {
  ingresos: number;
  gastos: number;
  ganancia: number;
  incomesByPackage: IPackageIncome[];
}

// Earthy chart palette (design-spec §1.4) for the "Ingresos por paquete" bars.
export const EARTH_BAR_COLORS = [
  '#33604A', // forest
  '#8A8A4E', // olive
  '#C9A45C', // gold
  '#A9704F', // sienna
  '#5F7386', // slate
  '#8FA98C', // sage
  '#B0806A', // clay
  '#7D6A85', // plum
];

export function earthBarColor(index: number): string {
  return EARTH_BAR_COLORS[index % EARTH_BAR_COLORS.length];
}

// ---- Paquetes (design-spec §4.16) -----------------------------------------
export interface IPackage {
  id: number;
  displayLabel: string;
  code: string;
  pricePerDay: number;
  consultPrice: number;
  monthDiscount: number;
  includesDesayuno: boolean;
  includesSnack1: boolean;
  includesComida: boolean;
  includesSnack2: boolean;
  includesCena: boolean;
  active: boolean;
}

export interface PackageDTO {
  displayLabel: string;
  code: string;
  pricePerDay: number;
  consultPrice: number;
  monthDiscount: number;
  includesDesayuno: boolean;
  includesSnack1: boolean;
  includesComida: boolean;
  includesSnack2: boolean;
  includesCena: boolean;
}

// Meal codes D/S1/C/S2/Ce derived from the includes_* booleans (design-spec §4.16).
export const MEAL_TOGGLES: { control: keyof PackageDTO; code: string; label: string }[] = [
  { control: 'includesDesayuno', code: 'D', label: 'Desayuno' },
  { control: 'includesSnack1', code: 'S1', label: 'Colación 1' },
  { control: 'includesComida', code: 'C', label: 'Comida' },
  { control: 'includesSnack2', code: 'S2', label: 'Colación 2' },
  { control: 'includesCena', code: 'Ce', label: 'Cena' },
];

export function packageMealCodes(pkg: IPackage): string[] {
  const codes: string[] = [];
  if (pkg.includesDesayuno) codes.push('D');
  if (pkg.includesSnack1) codes.push('S1');
  if (pkg.includesComida) codes.push('C');
  if (pkg.includesSnack2) codes.push('S2');
  if (pkg.includesCena) codes.push('Ce');
  return codes;
}

function titleCase(value: string): string {
  return value
    .toString()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
