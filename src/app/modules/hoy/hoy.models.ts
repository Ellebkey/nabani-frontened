// Domain models for the Hoy dashboard (design-spec §4.1, §8).
// Shapes mirror the /dashboard/today|attention|week endpoints.
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ---- GET /dashboard/today -------------------------------------------------
export interface DashboardPipeline {
  menuDelDia: { done: boolean; status: string; mealsAssigned: number };
  ajustes: { listos: number; conflictos: number; total: number };
  autorizacion: { autorizados: number; pendientes: number; adeudos: number };
  produccion: { ready: number; authorized: number; total: number };
}

export interface DashboardMetrics {
  incomeToday: number;
  activePatients: number;
  deliveriesToday: number;
}

export interface DashboardToday {
  date: string;
  pipeline: DashboardPipeline;
  metrics: DashboardMetrics;
}

// ---- GET /dashboard/attention ---------------------------------------------
export interface AttentionConflict {
  deliveryDayId: number;
  patientName: string;
  preferenceConflicts: number;
  diseaseConflicts: number;
}

export interface OverduePayment {
  paymentId: number;
  patientName: string;
  dueDate: string;
  amount: number;
  agingDays: number;
  bucket: string;
}

export interface ExpiringPackage {
  patientId: number;
  patientName: string;
  lastDeliveryDate: string;
  daysUntil: number;
}

export interface MissingMenu {
  deliveryDayId: number;
  patientName: string;
}

export interface DashboardAttention {
  date: string;
  conflicts: AttentionConflict[];
  overduePayments: OverduePayment[];
  expiringPackages: ExpiringPackage[];
  missingMenu: MissingMenu[];
}

// ---- GET /dashboard/week --------------------------------------------------
export type WeekDayStatus = 'completo' | 'ajustes' | 'borrador';

export interface WeekDay {
  date: string;
  deliveries: number;
  menuStatus: string;
  conflictCount: number;
  status: WeekDayStatus;
}

export interface DashboardWeek {
  startDate: string;
  endDate: string;
  days: WeekDay[];
}

// ---- Date helpers (es-MX; parseISO avoids the UTC-6 day shift) -------------
/** Local YYYY-MM-DD for "today" — built from local components, not toISOString. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** "sábado 4 de julio" */
export function formatLongDate(iso: string): string {
  return format(parseISO(iso), "EEEE d 'de' MMMM", { locale: es });
}

/** "Sáb 4" — capitalized abbreviated weekday for the week strip. */
export function weekdayLabel(iso: string): string {
  const label = format(parseISO(iso), 'EEE d', { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
