import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { TagsApiService } from './tags-api.service';
import { environment } from '@root/environments/environment';
import { ITag, TagListResponse } from '@shared/interfaces/tag.model';

describe('TagsApiService', () => {
  let service: TagsApiService;
  let httpMock: HttpTestingController;

  const API = environment.url;

  const tag: ITag = {
    id: 5,
    name: 'Vacaciones',
    color: '#3b82f6',
    description: 'Gastos del viaje'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TagsApiService]
    });

    service = TestBed.inject(TagsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getTags', () => {
    it('should GET /tags with no params by default', () => {
      const response: TagListResponse = { rows: [tag], count: 1 };
      let result: TagListResponse | undefined;

      service.getTags().subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/tags`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toHaveLength(0);
      req.flush(response);

      expect(result).toEqual(response);
    });

    it('should append limit, offset, searchText and fetchAll when provided', () => {
      service.getTags({ limit: 25, offset: 50, searchText: 'viaje', fetchAll: true }).subscribe();

      const req = httpMock.expectOne(r => r.url === `${API}/tags`);
      expect(req.request.params.get('limit')).toBe('25');
      expect(req.request.params.get('offset')).toBe('50');
      expect(req.request.params.get('searchText')).toBe('viaje');
      expect(req.request.params.get('fetchAll')).toBe('true');
      req.flush({ rows: [], count: 0 });
    });

    it('should omit falsy params (offset 0, fetchAll false, empty searchText)', () => {
      // documents current behavior: zero offset is treated as "not set"
      service.getTags({ limit: 10, offset: 0, searchText: '', fetchAll: false }).subscribe();

      const req = httpMock.expectOne(r => r.url === `${API}/tags`);
      expect(req.request.params.keys()).toEqual(['limit']);
      req.flush({ rows: [], count: 0 });
    });

    it('should propagate HTTP errors to the subscriber', () => {
      let status: number | undefined;

      service.getTags().subscribe({ error: (err) => (status = err.status) });

      httpMock.expectOne(`${API}/tags`).flush({}, { status: 500, statusText: 'Server Error' });

      expect(status).toBe(500);
    });
  });

  describe('getTag', () => {
    it('should GET /tags/:id', () => {
      let result: ITag | undefined;

      service.getTag(5).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/tags/5`);
      expect(req.request.method).toBe('GET');
      req.flush(tag);

      expect(result).toEqual(tag);
    });
  });

  describe('createTag', () => {
    it('should POST /tags with the create dto as body', () => {
      const dto = { name: 'Vacaciones', color: '#3b82f6', description: 'Gastos del viaje' };
      let result: ITag | undefined;

      service.createTag(dto).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/tags`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(tag);

      expect(result).toEqual(tag);
    });
  });

  describe('updateTag', () => {
    it('should PUT /tags/:id with the update dto as body', () => {
      const dto = { name: 'Viaje CDMX', color: '#ef4444' };
      let result: ITag | undefined;

      service.updateTag(5, dto).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/tags/5`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush({ ...tag, ...dto });

      expect(result?.name).toBe('Viaje CDMX');
    });
  });

  describe('deleteTag', () => {
    it('should DELETE /tags/:id', () => {
      let completed = false;

      service.deleteTag(5).subscribe({ complete: () => (completed = true) });

      const req = httpMock.expectOne(`${API}/tags/5`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      expect(completed).toBe(true);
    });
  });
});
