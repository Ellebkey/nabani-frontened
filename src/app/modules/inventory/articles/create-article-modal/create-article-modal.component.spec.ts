import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HotToastService } from '@ngxpert/hot-toast';
import { of, throwError } from 'rxjs';

import { CreateArticleModalComponent } from './create-article-modal.component';
import { ArticlesService } from '@app/modules/inventory/articles.service';

describe('CreateArticleModalComponent', () => {
  let fixture: ComponentFixture<CreateArticleModalComponent>;
  let component: CreateArticleModalComponent;

  let articlesApi: {
    getArticleById: jest.Mock;
    createArticle: jest.Mock;
    updateArticle: jest.Mock;
  };
  let dialogRef: { close: jest.Mock };
  let toast: { observe: jest.Mock };

  // Noon timestamps keep new Date(...) on the same calendar day in any timezone.
  const records = [
    { daySeen: '2026-06-07T12:00:00', price: '90' },
    { daySeen: '2026-06-05T12:00:00', price: '150' },
    { daySeen: '2026-06-05T12:00:00', price: '999' }, // duplicate day: ignored (first wins)
    { daySeen: '2026-06-01T12:00:00', price: '100' }
  ];

  function setup(data: unknown = null): void {
    articlesApi = {
      getArticleById: jest.fn().mockReturnValue(of({})),
      createArticle: jest.fn(),
      updateArticle: jest.fn()
    };
    dialogRef = { close: jest.fn() };
    toast = { observe: jest.fn(() => (source: unknown) => source) };

    TestBed.configureTestingModule({
    imports: [CommonModule, ReactiveFormsModule, CreateArticleModalComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        { provide: ArticlesService, useValue: articlesApi },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: HotToastService, useValue: toast },
        { provide: MAT_DIALOG_DATA, useValue: data }
    ]
});

    fixture = TestBed.createComponent(CreateArticleModalComponent);
    component = fixture.componentInstance;
  }

  function init(data: unknown = null): void {
    setup(data);
    component.ngOnInit();
  }

  describe('create mode (no dialog data)', () => {
    it('should initialize an empty required form without fetching anything', () => {
      init(null);

      expect(component.title()).toBe('Registrar artículo');
      expect(component.createArticleForm.value).toEqual({ concept: null });
      expect(component.createArticleForm.invalid).toBe(true);
      expect(component.showPriceHistory()).toBe(false);
      expect(articlesApi.getArticleById).not.toHaveBeenCalled();
    });

    it('should become valid once the concept is set', () => {
      init(null);

      component.createArticleForm.get('concept')!.setValue('Televisor');

      expect(component.createArticleForm.valid).toBe(true);
    });
  });

  describe('edit mode', () => {
    it('should patch the concept and load the price history', () => {
      setup({ id: 10, concept: 'Televisor' });
      articlesApi.getArticleById.mockReturnValue(of({ records, lastPrice: '90.5' }));

      component.ngOnInit();

      expect(component.title()).toBe('Actualizar artículo');
      expect(component.createArticleForm.value).toEqual({ concept: 'Televisor' });
      expect(articlesApi.getArticleById).toHaveBeenCalledWith(10);
      expect(component.showPriceHistory()).toBe(true);
      expect(component.latestPrice()).toBe(90.5);
    });

    it('should keep the price history hidden when the article has no records', () => {
      setup({ id: 10, concept: 'Televisor' });
      articlesApi.getArticleById.mockReturnValue(of({ records: [] }));

      component.ngOnInit();

      expect(component.showPriceHistory()).toBe(false);
      expect(component.priceHistory()).toEqual([]);
    });

    it('should leave the latest price at 0 when the article has records but no lastPrice', () => {
      setup({ id: 10, concept: 'Televisor' });
      articlesApi.getArticleById.mockReturnValue(of({ records }));

      component.ngOnInit();

      expect(component.showPriceHistory()).toBe(true);
      expect(component.latestPrice()).toBe(0);
    });
  });

  describe('processPriceHistory', () => {
    it('should sort newest first, dedupe by day and compute percentage changes', () => {
      init(null);

      component.processPriceHistory(records);

      expect(component.priceHistory()).toEqual([
        { date: '7 jun 2026', price: 90, percentageChange: -40, isIncrease: false },
        { date: '5 jun 2026', price: 150, percentageChange: 50, isIncrease: true },
        { date: '1 jun 2026', price: 100, percentageChange: undefined, isIncrease: undefined }
      ]);
    });
  });

  describe('formatters', () => {
    it('should format prices with two decimals and a dollar sign', () => {
      init(null);

      expect(component.formatPrice(12.5)).toBe('$12.50');
      expect(component.formatPrice(0)).toBe('$0.00');
    });

    it('should format percentages with a sign and one decimal', () => {
      init(null);

      expect(component.formatPercentage(50)).toBe('+50.0%');
      expect(component.formatPercentage(-40)).toBe('-40.0%');
      expect(component.formatPercentage(0)).toBe('0.0%');
      expect(component.formatPercentage(undefined)).toBe('');
    });
  });

  describe('save', () => {
    it('should not call the API when the form is invalid', () => {
      init(null);

      component.save();

      expect(articlesApi.createArticle).not.toHaveBeenCalled();
      expect(articlesApi.updateArticle).not.toHaveBeenCalled();
      expect(component.createArticleForm.disabled).toBe(false);
    });

    it('should create the article and close with the response', fakeAsync(() => {
      init(null);
      component.createArticleForm.get('concept')!.setValue('Televisor');
      articlesApi.createArticle.mockReturnValue(of({ id: 99, concept: 'Televisor' }));

      component.save();

      expect(component.createArticleForm.disabled).toBe(true);
      expect(articlesApi.createArticle).toHaveBeenCalledWith({ concept: 'Televisor' });
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Guardando...',
        success: 'Artículo creado exitosamente',
        error: 'Error al guardar el articulo'
      });

      expect(dialogRef.close).not.toHaveBeenCalled();
      tick(500);
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 99, concept: 'Televisor' });
    }));

    it('should update the article in edit mode with the update messages', fakeAsync(() => {
      init({ id: 10, concept: 'Televisor' });
      component.createArticleForm.get('concept')!.setValue('Televisor 4K');
      articlesApi.updateArticle.mockReturnValue(of({ id: 10, concept: 'Televisor 4K' }));

      component.save();

      expect(articlesApi.updateArticle).toHaveBeenCalledWith(10, { concept: 'Televisor 4K' });
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Actualizando...',
        success: 'Artículo actualizado exitosamente',
        error: 'Error al actualizar el articulo'
      });
      expect(articlesApi.createArticle).not.toHaveBeenCalled();

      tick(500);
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 10, concept: 'Televisor 4K' });
    }));

    it('should log the failure and still close the dialog with the error', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      init(null);
      component.createArticleForm.get('concept')!.setValue('Televisor');
      const failure = new Error('offline');
      articlesApi.createArticle.mockReturnValue(throwError(() => failure));

      component.save();
      tick(500);

      expect(consoleSpy).toHaveBeenCalledWith(failure);
      expect(dialogRef.close).toHaveBeenCalledWith(failure);
      consoleSpy.mockRestore();
    }));
  });

  it('should close the dialog without a result on cancel', () => {
    init(null);

    component.closeDialog();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
