import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';

import { ArticleSearchDialogComponent } from './article-search-dialog.component';
import { ArticlesService } from '@app/modules/inventory/articles.service';
import { IArticle } from '@shared/interfaces/article.model';

describe('ArticleSearchDialogComponent', () => {
  let fixture: ComponentFixture<ArticleSearchDialogComponent>;
  let component: ArticleSearchDialogComponent;
  let articlesService: { getArticleList: jest.Mock };
  let dialogRef: { close: jest.Mock };

  const leche: IArticle = { id: 4, concept: 'Leche entera', isEnabled: true };

  beforeEach(() => {
    articlesService = { getArticleList: jest.fn().mockReturnValue(of({ rows: [], count: 0 })) };
    dialogRef = { close: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ArticleSearchDialogComponent],
      providers: [
        { provide: ArticlesService, useValue: articlesService },
        { provide: MatDialogRef, useValue: dialogRef }
      ]
    });
    TestBed.overrideComponent(ArticleSearchDialogComponent, { set: { template: '', imports: [] } });
  });

  function create(): void {
    fixture = TestBed.createComponent(ArticleSearchDialogComponent);
    component = fixture.componentInstance;
  }

  function type(term: string): void {
    component.onSearchInput({ target: { value: term } } as unknown as Event);
  }

  it('should start empty without having searched', () => {
    create();

    expect(component['searchText']()).toBe('');
    expect(component['results']()).toEqual([]);
    expect(component['isLoading']()).toBe(false);
    expect(component['hasSearched']()).toBe(false);
  });

  it('should reflect the typed text immediately but only search after the 300ms debounce', fakeAsync(() => {
    create();
    articlesService.getArticleList.mockReturnValue(of({ rows: [leche], count: 1 }));

    type('lech');
    expect(component['searchText']()).toBe('lech');
    expect(articlesService.getArticleList).not.toHaveBeenCalled();

    tick(299);
    expect(articlesService.getArticleList).not.toHaveBeenCalled();

    tick(1);
    expect(articlesService.getArticleList).toHaveBeenCalledWith({ searchText: 'lech', limit: 20, offset: 0,
        withMeta: true });
    expect(component['results']()).toEqual([leche]);
    expect(component['isLoading']()).toBe(false);
    expect(component['hasSearched']()).toBe(true);
  }));

  it('should not hit the API for terms shorter than 2 characters', fakeAsync(() => {
    create();

    type('l');
    tick(300);

    expect(articlesService.getArticleList).not.toHaveBeenCalled();
    expect(component['results']()).toEqual([]);
  }));

  it('should clear previous results when the term is emptied', fakeAsync(() => {
    create();
    articlesService.getArticleList.mockReturnValue(of({ rows: [leche], count: 1 }));
    type('lech');
    tick(300);
    expect(component['results']()).toEqual([leche]);

    type('');
    tick(300);

    expect(component['results']()).toEqual([]);
    expect(articlesService.getArticleList).toHaveBeenCalledTimes(1);
  }));

  it('should collapse rapid typing into a single request for the last term', fakeAsync(() => {
    create();
    articlesService.getArticleList.mockReturnValue(of({ rows: [leche], count: 1 }));

    type('le');
    tick(100);
    type('lec');
    tick(300);

    expect(articlesService.getArticleList).toHaveBeenCalledTimes(1);
    expect(articlesService.getArticleList).toHaveBeenCalledWith({ searchText: 'lec', limit: 20, offset: 0,
        withMeta: true });
  }));

  it('should skip duplicate consecutive terms', fakeAsync(() => {
    create();
    articlesService.getArticleList.mockReturnValue(of({ rows: [leche], count: 1 }));

    type('lec');
    tick(300);
    type('lec');
    tick(300);

    expect(articlesService.getArticleList).toHaveBeenCalledTimes(1);
  }));

  it('should flag loading while the request is in flight', fakeAsync(() => {
    create();
    const response$ = new Subject<{ rows: IArticle[]; count: number }>();
    articlesService.getArticleList.mockReturnValue(response$);

    type('lech');
    tick(300);
    expect(component['isLoading']()).toBe(true);

    response$.next({ rows: [leche], count: 1 });

    expect(component['isLoading']()).toBe(false);
    expect(component['results']()).toEqual([leche]);
  }));

  it('should swallow API errors as an empty result and keep searching afterwards', fakeAsync(() => {
    create();
    articlesService.getArticleList
      .mockReturnValueOnce(throwError(() => new Error('boom')))
      .mockReturnValueOnce(of({ rows: [leche], count: 1 }));

    type('aaa');
    tick(300);
    expect(component['results']()).toEqual([]);
    expect(component['isLoading']()).toBe(false);
    expect(component['hasSearched']()).toBe(true);

    type('bbb');
    tick(300);
    expect(component['results']()).toEqual([leche]);
  }));

  it('should close with a concept-based fuzzy match when an article is picked', () => {
    create();

    component.selectArticle(leche);

    expect(dialogRef.close).toHaveBeenCalledWith({
      articleId: 4,
      concept: 'Leche entera',
      brand: null,
      barcode: null,
      score: 0,
      matchedOn: 'concept'
    });
  });

  it('should close with null on cancel', () => {
    create();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });

  describe('handoff popover behavior', () => {
    it('moves the highlight with wrap-around and selects the highlighted result', () => {
      create();
      component['results'].set([
        { id: 1, concept: 'Salmón', isEnabled: true },
        { id: 2, concept: 'Salsa', isEnabled: true },
      ]);

      component['moveHighlight'](1);
      expect(component['highlightedIndex']()).toBe(1);
      component['moveHighlight'](1);
      expect(component['highlightedIndex']()).toBe(0);
      component['moveHighlight'](-1);
      expect(component['highlightedIndex']()).toBe(1);

      component['selectHighlighted']();
      expect(dialogRef.close).toHaveBeenCalledWith(expect.objectContaining({ articleId: 2, concept: 'Salsa' }));
    });

    it('ignores highlight moves and Enter with no results', () => {
      create();

      component['moveHighlight'](1);
      component['selectHighlighted']();

      expect(component['highlightedIndex']()).toBe(0);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('closes with the createNew sentinel from the footer button', () => {
      create();
      component['createNew']();
      expect(dialogRef.close).toHaveBeenCalledWith({ createNew: true });
    });

    it('highlights the match in brand bold, escapes HTML, and maps muted colors', () => {
      create();
      component['searchText'].set('sal');

      const html = String(component['highlightMatch']('Salsa <b>x</b>'));
      expect(html).toContain('<mark');
      expect(html).toContain('&lt;b&gt;');
      expect(component['mutedColor']('#3570B4')).toBe('#3B5F82');

      component['searchText'].set('');
      expect(component['highlightMatch']('Salsa')).toBe('Salsa');
    });
  });

});
