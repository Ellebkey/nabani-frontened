import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@root/environments/environment';
import { ICategory, ISubcategory } from '@shared/interfaces/common.model';

export interface CreateCategoryDto {
  name: string;
  colorPalette?: string;
  enabledTiers?: string[];
}

export interface UpdateCategoryDto {
  name?: string;
  // null clears the category color (matches ICategory.colorPalette: string | null)
  colorPalette?: string | null;
  enabledTiers?: string[];
}

export interface CreateSubcategoryDto {
  name: string;
  categoryId: number;
  enabledTiers?: string[];
}

export interface UpdateSubcategoryDto {
  name: string;
  enabledTiers?: string[];
}

export interface SubcategoryExpenseItem {
  expenseId: number;
  articleId: number;
  concept: string;
  subtotal: number;
  expenseDate: string;
  recipientName: string;
}

export interface ReassignSubcategoryDto {
  targetCategoryId: number;
  targetSubcategoryId: number;
  items: { expenseId: number; articleId: number }[];
}

@Injectable({ providedIn: 'root' })
export class CategoriesApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.url;

  getCategories(): Observable<ICategory[]> {
    return this.http.get<ICategory[]>(`${this.API_URL}/categories`);
  }

  createCategory(data: CreateCategoryDto): Observable<ICategory> {
    return this.http.post<ICategory>(`${this.API_URL}/categories`, data);
  }

  updateCategory(id: number, data: UpdateCategoryDto): Observable<ICategory> {
    return this.http.put<ICategory>(`${this.API_URL}/categories/${id}`, data);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/categories/${id}`);
  }

  updateCategoryTiers(id: number, enabledTiers: string[]): Observable<ICategory> {
    return this.http.put<ICategory>(`${this.API_URL}/categories/${id}`, { enabledTiers });
  }

  getSubcategoriesByCategory(categoryId: number): Observable<ISubcategory[]> {
    return this.http.get<ISubcategory[]>(`${this.API_URL}/categories/${categoryId}/subcategories`);
  }

  createSubcategory(data: CreateSubcategoryDto): Observable<ISubcategory> {
    return this.http.post<ISubcategory>(`${this.API_URL}/subcategories`, data);
  }

  updateSubcategory(id: number, data: UpdateSubcategoryDto): Observable<ISubcategory> {
    return this.http.put<ISubcategory>(`${this.API_URL}/subcategories/${id}`, data);
  }

  deleteSubcategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/subcategories/${id}`);
  }

  updateSubcategoryTiers(id: number, enabledTiers: string[]): Observable<ISubcategory> {
    return this.http.put<ISubcategory>(`${this.API_URL}/subcategories/${id}`, { enabledTiers });
  }

  getSubcategoryExpenseItems(subcategoryId: number): Observable<SubcategoryExpenseItem[]> {
    return this.http.get<SubcategoryExpenseItem[]>(`${this.API_URL}/subcategories/${subcategoryId}/expense-items`);
  }

  reassignSubcategoryItems(subcategoryId: number, data: ReassignSubcategoryDto): Observable<{ reassigned: number }> {
    return this.http.put<{ reassigned: number }>(`${this.API_URL}/subcategories/${subcategoryId}/reassign`, data);
  }
}
