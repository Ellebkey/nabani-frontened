import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Query, RecordsList } from '@shared/interfaces/shared.model';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import {
  IIngredient,
  IngredientDTO,
  IDisease,
  IEmployee,
  EmployeeDTO,
  EmployeesList,
  IUser,
  UserDTO,
} from './catalogos.models';

@Injectable({
  providedIn: 'root',
})
export class CatalogosService extends HttpHelpersService {
  private http = inject(HttpClient);

  // ---- Ingredients (design-spec §4.17) ------------------------------------
  getIngredients(query: Query): Observable<RecordsList<IIngredient>> {
    const params = this.createHttpParams(query);
    return this.http.get<RecordsList<IIngredient>>(`${this.API_URL}/ingredients`, { params });
  }

  saveIngredient(ingredient: IngredientDTO): Observable<IIngredient> {
    return this.http.post<IIngredient>(`${this.API_URL}/ingredients`, { ...ingredient });
  }

  updateIngredient(id: number, ingredient: IngredientDTO): Observable<IIngredient> {
    return this.http.put<IIngredient>(`${this.API_URL}/ingredients/${id}`, { ...ingredient });
  }

  deleteIngredient(id: number): Observable<unknown> {
    return this.http.delete(`${this.API_URL}/ingredients/${id}`);
  }

  // ---- Diseases (filter + no-apto multiselect) ----------------------------
  getDiseases(): Observable<RecordsList<IDisease>> {
    return this.http.get<RecordsList<IDisease>>(`${this.API_URL}/diseases`);
  }

  // ---- Employees (design-spec §4.18) --------------------------------------
  getEmployees(query: Query): Observable<EmployeesList> {
    const params = this.createHttpParams(query);
    return this.http.get<EmployeesList>(`${this.API_URL}/employees`, { params });
  }

  saveEmployee(employee: EmployeeDTO): Observable<IEmployee> {
    return this.http.post<IEmployee>(`${this.API_URL}/employees`, { ...employee });
  }

  updateEmployee(id: number, employee: EmployeeDTO): Observable<IEmployee> {
    return this.http.put<IEmployee>(`${this.API_URL}/employees/${id}`, { ...employee });
  }

  deleteEmployee(id: number): Observable<unknown> {
    return this.http.delete(`${this.API_URL}/employees/${id}`);
  }

  // ---- Users (design-spec §4.19) ------------------------------------------
  getUsers(query: Query): Observable<RecordsList<IUser>> {
    const params = this.createHttpParams(query);
    return this.http.get<RecordsList<IUser>>(`${this.API_URL}/users`, { params });
  }

  saveUser(user: UserDTO): Observable<IUser> {
    return this.http.post<IUser>(`${this.API_URL}/users`, { ...user });
  }

  updateUser(id: number, user: UserDTO): Observable<IUser> {
    return this.http.put<IUser>(`${this.API_URL}/users/${id}`, { ...user });
  }

  deleteUser(id: number): Observable<unknown> {
    return this.http.delete(`${this.API_URL}/users/${id}`);
  }
}
