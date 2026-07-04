import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@root/environments/environment';
import {
  ITag,
  CreateTagDto,
  UpdateTagDto,
  TagListResponse,
} from '@shared/interfaces/tag.model';

interface TagQueryParams {
  limit?: number;
  offset?: number;
  searchText?: string;
  fetchAll?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TagsApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.url;

  getTags(query: TagQueryParams = {}): Observable<TagListResponse> {
    let params = new HttpParams();

    if (query.limit) params = params.append('limit', query.limit.toString());
    if (query.offset) params = params.append('offset', query.offset.toString());
    if (query.searchText) params = params.append('searchText', query.searchText);
    if (query.fetchAll) params = params.append('fetchAll', 'true');

    return this.http.get<TagListResponse>(`${this.API_URL}/tags`, { params });
  }

  getTag(id: number): Observable<ITag> {
    return this.http.get<ITag>(`${this.API_URL}/tags/${id}`);
  }

  createTag(data: CreateTagDto): Observable<ITag> {
    return this.http.post<ITag>(`${this.API_URL}/tags`, data);
  }

  updateTag(id: number, data: UpdateTagDto): Observable<ITag> {
    return this.http.put<ITag>(`${this.API_URL}/tags/${id}`, data);
  }

  deleteTag(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/tags/${id}`);
  }
}
