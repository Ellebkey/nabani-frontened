import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { toMutedColor } from '@shared/services/maguey-palette';
import {
  SankeyData,
  CashFlowQuery,
  SubCategoryData,
  ExpenseItemsByCategoryResponse,
  ExpenseItemsByCategoryQuery,
  UpdateExpenseItemCategoryPayload,
  CategoryComparisonQuery,
  CategoryComparison,
} from '../../interfaces/cash-flow.model';

@Injectable({
  providedIn: 'root'
})
export class CashFlowService extends HttpHelpersService {
  private http = inject(HttpClient);


  public getCashFlowSankey(query: CashFlowQuery): Observable<SankeyData> {
    const params = this.createHttpParams(query);
    return this.http.get<SankeyData>(`${this.API_URL}/accounts/cash-flow-sankey`, { params })
      .pipe(map(data => this.withMutedNodeColors(data)));
  }

  public getCashFlowSankeyByTags(tagIds: string): Observable<SankeyData> {
    const params = this.createHttpParams({ tagIds });
    return this.http.get<SankeyData>(`${this.API_URL}/accounts/cash-flow-sankey-by-tags`, { params })
      .pipe(map(data => this.withMutedNodeColors(data)));
  }

  public getCategoryComparison(query: CategoryComparisonQuery): Observable<CategoryComparison> {
    const cleaned = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
    ) as { [key: string]: string };
    const params = this.createHttpParams(cleaned);
    return this.http.get<CategoryComparison>(`${this.API_URL}/expenses/category-comparison`, { params });
  }

  private withMutedNodeColors(data: SankeyData): SankeyData {
    return {
      ...data,
      nodes: data.nodes.map(node => node.id === 'total-expenses'
        ? node
        : { ...node, color: toMutedColor(node.color) }),
    };
  }

  public getSubCategoriesByCategory(query: CashFlowQuery & { categoryId: number }): Observable<SubCategoryData> {
    const params = this.createHttpParams(query);
    return this.http.get<SubCategoryData>(`${this.API_URL}/total-expenses-by-subcategory`, { params });
  }

  public getSubCategoriesByCategoryWithTags(categoryId: number, tagIds: string): Observable<SubCategoryData> {
    const params = this.createHttpParams({ categoryId, tagIds });
    return this.http.get<SubCategoryData>(`${this.API_URL}/expenses-by-subcategory-with-tags`, { params });
  }

  public getExpenseItemsByCategory(query: ExpenseItemsByCategoryQuery): Observable<ExpenseItemsByCategoryResponse> {
    const params = this.createHttpParams(query);
    return this.http.get<ExpenseItemsByCategoryResponse>(`${this.API_URL}/expense-items-by-category`, { params });
  }

  public updateExpenseItemCategory(payload: UpdateExpenseItemCategoryPayload): Observable<void> {
    return this.http.patch<void>(`${this.API_URL}/expense-items/category`, payload);
  }
}
