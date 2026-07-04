import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';

import { ArticleCreateDialogComponent, ArticleCreateDialogData } from './article-create-dialog.component';
import { ICategory } from '@shared/interfaces/common.model';

const categories: ICategory[] = [
  {
    id: 2,
    name: 'Comida',
    colorPalette: '#C9A45C',
    subcategories: [{ id: 10, name: 'Abarrotes' }, { id: 11, name: 'Restaurant' }],
  } as ICategory,
];

describe('ArticleCreateDialogComponent', () => {
  let fixture: ComponentFixture<ArticleCreateDialogComponent>;
  let component: ArticleCreateDialogComponent;
  let dialogRef: { close: jest.Mock };

  function setup(data: Partial<ArticleCreateDialogData> = {}): void {
    TestBed.resetTestingModule();
    dialogRef = { close: jest.fn() };
    TestBed.configureTestingModule({
      imports: [ArticleCreateDialogComponent, MatIconTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { ocrText: 'FILETE SALMO 1.495 KG', barcode: '7501055310884', categories, ...data },
        },
      ],
    });
    fixture = TestBed.createComponent(ArticleCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('prefills the concept title-cased from the OCR text and enables learnCode when there is a barcode', () => {
    setup();

    expect(component.concept).toBe('Filete Salmo 1.495 Kg');
    expect(component.learnCode).toBe(true);
  });

  it('disables learnCode and hides the code row without a barcode', () => {
    setup({ barcode: null });

    expect(component.learnCode).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Guardar código');
  });

  it('formats EAN-13 barcodes in groups and leaves other lengths as-is', () => {
    setup();
    expect(component.formattedBarcode).toBe('7 501055 310884');

    setup({ barcode: '12345' });
    expect(component.formattedBarcode).toBe('12345');
  });

  it('builds category options with muted colors and dependent subcategory options', () => {
    setup({ categoryId: 2 });

    expect(component.categoryOptions).toEqual([{ value: 2, label: 'Comida', color: '#C9A45C' }]);
    expect(component.subcategoryOptions).toEqual([
      { value: 10, label: 'Abarrotes' },
      { value: 11, label: 'Restaurant' },
    ]);

    component.onCategoryChange(null);
    expect(component.subcategoryOptions).toEqual([]);
    expect(component.subcategoryId).toBeNull();
  });

  it('"Usar tal cual" copies the raw OCR text into the concept', () => {
    setup();
    component.concept = 'Otra cosa';

    component.useAsIs();

    expect(component.concept).toBe('FILETE SALMO 1.495 KG');
  });

  it('does not close while invalid; closes with the payload when complete', () => {
    setup();
    component.save();
    expect(component.touched()).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();

    component.categoryId = 2;
    component.subcategoryId = 10;
    component.concept = '  Filete de Salmón  ';
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      concept: 'Filete de Salmón',
      categoryId: 2,
      subcategoryId: 10,
      learnCode: true,
    });
  });

  it('cancel closes with null', () => {
    setup();
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});
