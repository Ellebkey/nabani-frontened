import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from 'environments/environment';

import { TagService } from './tag.service';
import { ITag, ITagSummary, TagListResponse } from '@shared/interfaces/tag.model';

describe('TagService', () => {
  let service: TagService;
  let httpMock: HttpTestingController;

  const API = `${environment.url}/tags`;

  const tag: ITag = {
    id: 1,
    name: 'Comida',
    color: '#EF4444',
    description: 'Gastos de comida'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TagService]
    });

    service = TestBed.inject(TagService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jest.restoreAllMocks();
  });

  describe('getTags', () => {
    it('should GET /tags without params by default', () => {
      let response: TagListResponse | undefined;

      service.getTags().subscribe(r => (response = r));

      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toHaveLength(0);

      req.flush({ rows: [tag], count: 1 });

      // Raw color #EF4444 migrates to the closest muted (Teja)
      expect(response).toEqual({ rows: [{ ...tag, color: '#A64F4F' }], count: 1 });
    });

    it('should append defined query params and skip empty strings', () => {
      service.getTags({ limit: 10, offset: 0, searchText: '', fetchAll: false }).subscribe();

      const req = httpMock.expectOne(r => r.url === API);
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('offset')).toBe('0');
      expect(req.request.params.get('fetchAll')).toBe('false');
      expect(req.request.params.has('searchText')).toBe(false);

      req.flush({ rows: [], count: 0 });
    });

    it('should propagate server errors to the subscriber', () => {
      let error: HttpErrorResponse | undefined;

      service.getTags().subscribe({ error: e => (error = e) });

      httpMock.expectOne(API).flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
    });
  });

  describe('getTagById', () => {
    it('should GET /tags/:id', () => {
      let response: ITag | undefined;

      service.getTagById(5).subscribe(r => (response = r));

      const req = httpMock.expectOne(`${API}/5`);
      expect(req.request.method).toBe('GET');

      req.flush({ ...tag, id: 5 });

      expect(response?.id).toBe(5);
      expect(response?.name).toBe('Comida');
    });
  });

  describe('createTag', () => {
    it('should POST the tag dto as the body', () => {
      const dto = { name: 'Viajes', color: '#3B82F6', description: 'Gastos de viaje' };
      let response: ITag | undefined;

      service.createTag(dto).subscribe(r => (response = r));

      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);

      req.flush({ id: 9, ...dto });

      expect(response).toEqual({ id: 9, ...dto });
    });
  });

  describe('updateTag', () => {
    it('should PUT the partial dto to /tags/:id', () => {
      const dto = { name: 'Renombrado' };

      service.updateTag(3, dto).subscribe();

      const req = httpMock.expectOne(`${API}/3`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);

      req.flush({ ...tag, id: 3, name: 'Renombrado' });
    });
  });

  describe('deleteTag', () => {
    it('should DELETE /tags/:id and complete', () => {
      let completed = false;

      service.deleteTag(7).subscribe({ complete: () => (completed = true) });

      const req = httpMock.expectOne(`${API}/7`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toBeNull();

      req.flush(null);

      expect(completed).toBe(true);
    });
  });

  describe('getTagSummaries', () => {
    it('should GET /tags/summaries with the date range params', () => {
      const summaries: ITagSummary[] = [
        { id: 1, name: 'Comida', color: '#EF4444', totalAmount: 1250.5, expenseCount: 8 }
      ];
      let response: ITagSummary[] | undefined;

      service.getTagSummaries({ startDate: '2026-06-01', endDate: '2026-06-30' })
        .subscribe(r => (response = r));

      const req = httpMock.expectOne(r => r.url === `${API}/summaries`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2026-06-01');
      expect(req.request.params.get('endDate')).toBe('2026-06-30');

      req.flush(summaries);

      expect(response).toEqual(summaries.map(summary => ({ ...summary, color: '#A64F4F' })));
    });

    it('should GET /tags/summaries without query params by default', () => {
      let response: ITagSummary[] | undefined;

      service.getTagSummaries().subscribe(r => (response = r));

      const req = httpMock.expectOne(`${API}/summaries`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toHaveLength(0);

      req.flush([]);

      expect(response).toEqual([]);
    });
  });

  describe('createTagWithRandomColor', () => {
    it('should POST a trimmed name with the first palette color when random is 0', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);

      service.createTagWithRandomColor('  Comida  ').subscribe();

      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.name).toBe('Comida');
      expect(req.request.body.color).toBe('#3B5F82');
      expect(req.request.body.color).toMatch(/^#[0-9A-F]{6}$/);

      req.flush({ id: 11, ...req.request.body });
    });

    it('should pick the last palette color when random approaches 1', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9999);

      service.createTagWithRandomColor('Hogar').subscribe();

      const req = httpMock.expectOne(API);
      expect(req.request.body).toEqual({ name: 'Hogar', color: '#2E3A46' });

      req.flush({ id: 12, ...req.request.body });
    });

    it('should always send a hex palette color without mocking randomness', () => {
      let response: ITag | undefined;

      service.createTagWithRandomColor('Mascotas').subscribe(r => (response = r));

      const req = httpMock.expectOne(API);
      expect(req.request.body.name).toBe('Mascotas');
      expect(req.request.body.color).toMatch(/^#[0-9A-F]{6}$/);

      req.flush({ id: 13, ...req.request.body });

      expect(response?.id).toBe(13);
    });
  });
});
