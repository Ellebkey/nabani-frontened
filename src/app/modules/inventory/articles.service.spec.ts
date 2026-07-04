import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { ArticlesService } from './articles.service';
import { IArticle } from '@shared/interfaces/article.model';
import { RecordsList } from '@shared/interfaces/shared.model';
import { environment } from '@root/environments/environment';

const API_URL = environment.url;

describe('ArticlesService', () => {
  let service: ArticlesService;
  let httpMock: HttpTestingController;

  const article: IArticle = { id: 3, concept: 'Leche entera', isEnabled: true };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(ArticlesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getArticleList', () => {
    it('should GET articles with pagination and search params', () => {
      const list: RecordsList<IArticle> = { rows: [article], count: 1 };
      let result: RecordsList<IArticle> | undefined;

      service
        .getArticleList({ limit: 50, offset: 100, searchText: 'leche' })
        .subscribe(res => (result = res));

      const req = httpMock.expectOne(r => r.url === `${API_URL}/articles`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('50');
      expect(req.request.params.get('offset')).toBe('100');
      expect(req.request.params.get('searchText')).toBe('leche');
      req.flush(list);

      expect(result).toEqual(list);
    });

    it('should omit empty-string search params', () => {
      service.getArticleList({ limit: 10, offset: 0, searchText: '' }).subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/articles`);
      expect(req.request.params.keys().sort()).toEqual(['limit', 'offset']);
      req.flush({ rows: [], count: 0 });
    });

    it('should propagate a server error to the subscriber', () => {
      let error: HttpErrorResponse | undefined;

      service.getArticleList({ limit: 10 }).subscribe({
        error: (err: HttpErrorResponse) => (error = err)
      });

      httpMock
        .expectOne(r => r.url === `${API_URL}/articles`)
        .flush({ message: 'falló' }, { status: 500, statusText: 'Internal Server Error' });

      expect(error?.status).toBe(500);
    });
  });

  describe('getArticleById', () => {
    it('should GET the article by id', () => {
      let result: any;

      service.getArticleById(3).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/articles/3`);
      expect(req.request.method).toBe('GET');
      req.flush(article);

      expect(result).toEqual(article);
    });
  });

  describe('createArticle', () => {
    it('should POST a copy of the article payload', () => {
      let result: IArticle | undefined;

      service.createArticle(article).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/articles`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(article);
      expect(req.request.body).not.toBe(article);
      req.flush(article);

      expect(result).toEqual(article);
    });
  });

  describe('updateArticleState', () => {
    it('should PUT the articles wrapped in an articles property', () => {
      const articles: IArticle[] = [
        { id: 3, concept: 'Leche entera', isEnabled: false },
        { id: 4, concept: 'Pan integral', isEnabled: true }
      ];
      let completed = false;

      service.updateArticleState(articles).subscribe(() => (completed = true));

      const req = httpMock.expectOne(`${API_URL}/articles`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ articles });
      req.flush({});

      expect(completed).toBe(true);
    });
  });

  describe('destroyArticle', () => {
    it('should DELETE the article by id', () => {
      let completed = false;

      service.destroyArticle(3).subscribe(() => (completed = true));

      const req = httpMock.expectOne(`${API_URL}/articles/3`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});

      expect(completed).toBe(true);
    });
  });

  describe('updateArticle', () => {
    it('should PUT a copy of the body to the id route', () => {
      const body = { concept: 'Leche deslactosada' };
      let completed = false;

      service.updateArticle(3, body).subscribe(() => (completed = true));

      const req = httpMock.expectOne(`${API_URL}/articles/3`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      expect(req.request.body).not.toBe(body);
      req.flush({});

      expect(completed).toBe(true);
    });
  });
});
