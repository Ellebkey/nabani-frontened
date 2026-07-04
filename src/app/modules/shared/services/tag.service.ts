import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { MAGUEY_USER_COLORS, toMutedColor } from '@shared/services/maguey-palette';
import { Query } from '@shared/interfaces/shared.model';
import {
  ITag,
  ITagSummary,
  CreateTagDto,
  UpdateTagDto,
  TagListResponse,
} from '@shared/interfaces/tag.model';

const TAG_COLORS = MAGUEY_USER_COLORS;

@Injectable({
  providedIn: 'root'
})
export class TagService extends HttpHelpersService {
  private http = inject(HttpClient);


  getTags(query: Query = {}): Observable<TagListResponse> {
    const params = this.createHttpParams(query);
    return this.http.get<TagListResponse>(`${this.API_URL}/tags`, { params }).pipe(
      map(response => ({ ...response, rows: response.rows?.map(tag => ({ ...tag, color: toMutedColor(tag.color) })) }))
    );
  }

  getTagById(id: number): Observable<ITag> {
    return this.http.get<ITag>(`${this.API_URL}/tags/${id}`);
  }

  createTag(tag: CreateTagDto): Observable<ITag> {
    return this.http.post<ITag>(`${this.API_URL}/tags`, tag);
  }

  updateTag(id: number, tag: UpdateTagDto): Observable<ITag> {
    return this.http.put<ITag>(`${this.API_URL}/tags/${id}`, tag);
  }

  deleteTag(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/tags/${id}`);
  }

  getTagSummaries(query: Query = {}): Observable<ITagSummary[]> {
    const params = this.createHttpParams(query);
    return this.http.get<ITagSummary[]>(`${this.API_URL}/tags/summaries`, { params }).pipe(
      map(summaries => summaries.map(summary => ({ ...summary, color: toMutedColor(summary.color) })))
    );
  }

  /**
   * Creates a tag with a randomly assigned color from the predefined palette.
   * Useful for on-the-fly tag creation in dropdowns.
   * @param name - The name of the tag to create
   * @returns Observable of the created tag
   */
  createTagWithRandomColor(name: string): Observable<ITag> {
    const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
    return this.createTag({ name: name.trim(), color: randomColor });
  }
}
