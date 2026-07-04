import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { es } from 'date-fns/locale';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { of, throwError } from 'rxjs';

import { ArticlesListComponent } from './articles-list.component';
import { CreateArticleModalComponent } from '../create-article-modal/create-article-modal.component';
import { ArticlesService } from '../../articles.service';
import { PaginationService } from '@shared/services/pagination.service';
import { CommonService } from '@shared/services/common.service';
import { AlertService } from '@shared/services/alert.service';
import { IArticle } from '@shared/interfaces/article.model';

describe('ArticlesListComponent', () => {
  let fixture: ComponentFixture<ArticlesListComponent>;
  let component: ArticlesListComponent;

  let articlesApi: { getArticleList: jest.Mock; updateArticleState: jest.Mock; destroyArticle: jest.Mock };
  let paginationService: { getDefaultPagination: jest.Mock };
  let toast: { observe: jest.Mock; info: jest.Mock };
  let dialog: { open: jest.Mock };
  let common: { getDefaultDeleteConfirmation: jest.Mock };
  let magueyConfirmation: { open: jest.Mock };
  let alertService: { error: jest.Mock };
  let dialogResult: unknown;
  let confirmResult: unknown;

  const deleteConfig = { title: 'Remove article' };

  const tele: IArticle = { id: 10, concept: 'Televisor', isEnabled: true };
  const consola: IArticle = { id: 11, concept: 'Consola', isEnabled: false };

  const baseParams = { limit: 25, offset: 0, searchText: null, fetchAll: 'true' };

  beforeEach(() => {
    dialogResult = undefined;
    confirmResult = undefined;

    articlesApi = {
      getArticleList: jest.fn().mockReturnValue(of({ rows: [tele, consola], count: 2 })),
      updateArticleState: jest.fn().mockReturnValue(of([])),
      destroyArticle: jest.fn().mockReturnValue(of(void 0))
    };
    paginationService = {
      getDefaultPagination: jest.fn((showInput = false) => ({
        limit: 25,
        offset: 0,
        searchText: null,
        count: 0,
        showInputSearch: showInput
      }))
    };
    toast = { observe: jest.fn(() => (source: unknown) => source), info: jest.fn() };
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })) };
    common = { getDefaultDeleteConfirmation: jest.fn(() => deleteConfig) };
    magueyConfirmation = { open: jest.fn(() => ({ afterClosed: () => of(confirmResult) })) };
    alertService = { error: jest.fn() };

    TestBed.configureTestingModule({
    imports: [CommonModule, MatMenuModule, MatIconTestingModule, EmptyStateComponent, ArticlesListComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        provideRouter([]), provideDateFnsAdapter(), { provide: MAT_DATE_LOCALE, useValue: es },
        provideNoopAnimations(),
        { provide: ArticlesService, useValue: articlesApi },
        { provide: PaginationService, useValue: paginationService },
        { provide: HotToastService, useValue: toast },
        { provide: MatDialog, useValue: dialog },
        { provide: CommonService, useValue: common },
        { provide: MagueyConfirmationService, useValue: magueyConfirmation },
        { provide: AlertService, useValue: alertService }
    ]
});
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(ArticlesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('initial load', () => {
    it('should load the article list with search-enabled pagination and fetchAll', () => {
      createComponent();

      expect(paginationService.getDefaultPagination).toHaveBeenCalledWith(true);
      expect(component.pagination().showInputSearch).toBe(true);
      expect(articlesApi.getArticleList).toHaveBeenCalledWith(baseParams);
      expect(component.articles()).toEqual([tele, consola]);
      expect(component.pagination().count).toBe(2);
    });

    it('should only log when the load fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const failure = new Error('boom');
      articlesApi.getArticleList.mockReturnValue(throwError(() => failure));

      createComponent();

      expect(consoleSpy).toHaveBeenCalledWith(failure);
      expect(component.articles()).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should show the Spanish empty state when there are no articles', () => {
      articlesApi.getArticleList.mockReturnValue(of({ rows: [], count: 0 }));

      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('No hay artículos registrados');
      expect(text).toContain('Crear primer artículo');
      expect(text).not.toContain('Listado de artículos');
    });

    it('should show the list header when articles exist', () => {
      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Listado de artículos');
      expect(text).not.toContain('No hay artículos registrados');
    });
  });

  describe('pagination and search', () => {
    it('should reload with the new limit and offset', () => {
      createComponent();

      component.onPageChange({ limit: 50, offset: 25 });

      expect(component.pagination().limit).toBe(50);
      expect(component.pagination().offset).toBe(25);
      expect(articlesApi.getArticleList).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 50, offset: 25, fetchAll: 'true' })
      );
    });

    it('should reset the offset and reload with the debounced search text', fakeAsync(() => {
      createComponent();
      component.pagination.update(p => ({ ...p, offset: 75 }));

      component.searchControl.setValue('  tele  ');
      tick(350);

      expect(component.pagination().searchText).toBe('tele');
      expect(component.pagination().offset).toBe(0);
      expect(articlesApi.getArticleList).toHaveBeenLastCalledWith(
        expect.objectContaining({ searchText: 'tele', offset: 0 })
      );
    }));
  });

  describe('create and edit modals', () => {
    it('should open the create modal and reload when it closes with a result', () => {
      dialogResult = { id: 99 };

      createComponent();
      component.openCreateArticle();

      expect(dialog.open).toHaveBeenCalledWith(CreateArticleModalComponent, {
        disableClose: true,
        width: '440px'
      });
      expect(articlesApi.getArticleList).toHaveBeenCalledTimes(2);
    });

    it('should not reload when the create modal is dismissed', () => {
      dialogResult = undefined;

      createComponent();
      component.openCreateArticle();

      expect(articlesApi.getArticleList).toHaveBeenCalledTimes(1);
    });

    it('should open the edit modal with the article as data', () => {
      dialogResult = { id: 10 };

      createComponent();
      component.editDetailsArticle(tele);

      expect(dialog.open).toHaveBeenCalledWith(CreateArticleModalComponent, {
        disableClose: true,
        data: tele,
        width: '500px'
      });
      expect(articlesApi.getArticleList).toHaveBeenCalledTimes(2);
    });
  });

  describe('enable/disable flow', () => {
    it('should mutate the article state and track it in the selection', () => {
      createComponent();

      component.toggleStatus(false, tele);

      expect(tele.isEnabled).toBe(false);
      expect(component.selection.selected).toEqual([tele]);
    });

    it('should keep a single selection entry when the same article is toggled twice', () => {
      createComponent();

      component.toggleStatus(false, tele);
      component.toggleStatus(true, tele);

      expect(tele.isEnabled).toBe(true);
      expect(component.selection.selected).toHaveLength(1);
    });

    it('should show the singular and plural Spanish selection headers', () => {
      createComponent();

      component.toggleStatus(false, tele);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('1 cambio pendiente');

      component.toggleStatus(true, consola);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('2 cambios pendientes');
    });

    it('should submit the selected articles, clear the selection and reload', () => {
      createComponent();
      component.toggleStatus(false, tele);
      component.toggleStatus(true, consola);

      component.submitChanges();

      expect(articlesApi.updateArticleState).toHaveBeenCalledWith([tele, consola]);
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Guardando...',
        success: 'Articulos actualizados exitosamente',
        error: 'Error al guardar los articulos'
      });
      expect(component.selection.selected).toHaveLength(0);
      expect(articlesApi.getArticleList).toHaveBeenCalledTimes(2);
    });

    it('should also clear the selection when the update fails (catchError swallows the error)', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      createComponent();
      component.toggleStatus(false, tele);
      articlesApi.updateArticleState.mockReturnValue(throwError(() => new Error('boom')));

      component.submitChanges();

      // Source finding: catchError maps the failure into a next emission, so the
      // subscriber's error branch (which would keep the selection) is unreachable.
      expect(component.selection.selected).toHaveLength(0);
      expect(articlesApi.getArticleList).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });

    it('should clear the selection and reload on manual clear', () => {
      createComponent();
      component.toggleStatus(false, tele);

      component.clearSelection();

      expect(component.selection.selected).toHaveLength(0);
      expect(articlesApi.getArticleList).toHaveBeenCalledTimes(2);
    });
  });

  describe('delete article', () => {
    it('should delete after confirmation, reload and toast in Spanish', () => {
      confirmResult = 'confirmed';

      createComponent();
      component.deleteArticle(tele);

      expect(common.getDefaultDeleteConfirmation).toHaveBeenCalledWith({ objectName: 'article' });
      expect(magueyConfirmation.open).toHaveBeenCalledWith(deleteConfig);
      expect(articlesApi.destroyArticle).toHaveBeenCalledWith(10);
      expect(articlesApi.getArticleList).toHaveBeenCalledTimes(2);
      expect(toast.info).toHaveBeenCalledWith('El registro fue eliminado correctamente.');
    });

    it('should not delete when the confirmation is cancelled', () => {
      confirmResult = 'cancelled';

      createComponent();
      component.deleteArticle(tele);

      expect(articlesApi.destroyArticle).not.toHaveBeenCalled();
    });

    it('should surface the backend message through the alert service on failure', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      confirmResult = 'confirmed';
      const failure = { error: { message: 'El artículo está en uso' } };
      articlesApi.destroyArticle.mockReturnValue(throwError(() => failure));

      createComponent();
      component.deleteArticle(tele);

      expect(alertService.error).toHaveBeenCalledWith('El artículo está en uso', {
        duration: 10000,
        appearance: 'outline'
      });
      expect(toast.info).not.toHaveBeenCalled();
      expect(articlesApi.getArticleList).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });
  });
});
