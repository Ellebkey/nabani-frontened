import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { Query, RecordsList } from '@shared/interfaces/shared.model';
import { IArticle } from '@shared/interfaces/article.model';


@Injectable({
  providedIn: 'root'
})
export class ArticlesService extends HttpHelpersService{
  private http = inject(HttpClient);


  getArticleList (query: Query): Observable<RecordsList<IArticle>> {
    const params = this.createHttpParams(query);

    return this.http.get<RecordsList<IArticle>>(`${this.API_URL}/articles`, {params});
  }

  getArticleById (id: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/articles/${id}`);
  }

  createArticle(article: IArticle): Observable<IArticle> {
    return this.http.post<IArticle>(`${this.API_URL}/articles`, { ...article });
  }

  updateArticleState(articles: IArticle[]): Observable<unknown> {
    return this.http.put<unknown>(`${this.API_URL}/articles`, { articles });
  }

  destroyArticle(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.API_URL}/articles/${id}`);
  }

  updateArticle(id: number, body: any): Observable<unknown> {
    return this.http.put<unknown>(`${this.API_URL}/articles/${id}`, { ...body});
  }
}
