import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Query, RecordsList } from '@shared/interfaces/shared.model';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import {
  IPatient,
  PatientDTO,
  IConsultation,
  ConsultationDTO,
  ICalendarDay,
  IPayment,
  PaymentUpdateDTO,
  IPackage,
  ICalorieLevel,
  IDisease,
  IIngredientOption,
  SaleCalcDTO,
  SaleCalcResult,
} from './pacientes.models';

@Injectable({ providedIn: 'root' })
export class PacientesService extends HttpHelpersService {
  private http = inject(HttpClient);

  // ---- Patients (design-spec §4.10–§4.11) ---------------------------------
  getPatients(query: Query): Observable<RecordsList<IPatient>> {
    const params = this.createHttpParams(query);
    return this.http.get<RecordsList<IPatient>>(`${this.API_URL}/patients`, { params });
  }

  getPatient(id: number): Observable<IPatient> {
    return this.http.get<IPatient>(`${this.API_URL}/patients/${id}`);
  }

  savePatient(patient: PatientDTO): Observable<IPatient> {
    return this.http.post<IPatient>(`${this.API_URL}/patients`, { ...patient });
  }

  updatePatient(id: number, patient: PatientDTO): Observable<IPatient> {
    return this.http.put<IPatient>(`${this.API_URL}/patients/${id}`, { ...patient });
  }

  updateStatus(id: number, status: string): Observable<IPatient> {
    return this.http.put<IPatient>(`${this.API_URL}/patients/${id}/status`, { status });
  }

  // ---- Consultations (Historial clínico) ----------------------------------
  getConsultations(patientId: number): Observable<RecordsList<IConsultation>> {
    return this.http.get<RecordsList<IConsultation>>(`${this.API_URL}/patients/${patientId}/consultations`);
  }

  saveConsultation(patientId: number, consultation: ConsultationDTO): Observable<IConsultation> {
    return this.http.post<IConsultation>(`${this.API_URL}/patients/${patientId}/consultations`, { ...consultation });
  }

  // ---- Calendar (delivery days) -------------------------------------------
  getCalendarDays(patientId: number): Observable<ICalendarDay[]> {
    return this.http.get<ICalendarDay[]>(`${this.API_URL}/calendar-days/${patientId}`);
  }

  // ---- Payments (Cobranza / Pagos) ----------------------------------------
  getPayments(patientId: number): Observable<RecordsList<IPayment>> {
    const params = this.createHttpParams({ patientId });
    return this.http.get<RecordsList<IPayment>>(`${this.API_URL}/payments`, { params });
  }

  updatePayment(id: number, payload: PaymentUpdateDTO): Observable<IPayment> {
    return this.http.put<IPayment>(`${this.API_URL}/payments/${id}`, { ...payload });
  }

  // ---- Sales (Nueva venta) ------------------------------------------------
  calculateSale(payload: SaleCalcDTO): Observable<SaleCalcResult> {
    return this.http.post<SaleCalcResult>(`${this.API_URL}/sales/calculate-package-and-days`, { ...payload });
  }

  // ---- Support data -------------------------------------------------------
  getPackages(): Observable<RecordsList<IPackage>> {
    return this.http.get<RecordsList<IPackage>>(`${this.API_URL}/packages`);
  }

  getCalorieLevels(): Observable<RecordsList<ICalorieLevel>> {
    return this.http.get<RecordsList<ICalorieLevel>>(`${this.API_URL}/calorie-levels`);
  }

  getDiseases(): Observable<RecordsList<IDisease>> {
    return this.http.get<RecordsList<IDisease>>(`${this.API_URL}/diseases`);
  }

  getIngredients(query: Query = {}): Observable<RecordsList<IIngredientOption>> {
    const params = this.createHttpParams(query);
    return this.http.get<RecordsList<IIngredientOption>>(`${this.API_URL}/ingredients`, { params });
  }
}
