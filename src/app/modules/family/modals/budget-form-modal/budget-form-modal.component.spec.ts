import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { BudgetFormModalComponent, BudgetFormModalData } from './budget-form-modal.component';
import { IFamilyBudget, IFamilyCategoryRef } from '../../models/family.model';

describe('BudgetFormModalComponent', () => {
  let dialogRef: { close: jest.Mock };

  const categories: IFamilyCategoryRef[] = [
    { categoryId: 1, name: 'Hogar' },
    { categoryId: 2, name: 'Súper' }
  ];

  const budget: IFamilyBudget = {
    id: 'b-1',
    categoryId: 2,
    categoryName: 'Súper',
    amount: 450,
    periodMonth: '2026-06',
    createdAt: '2026-06-01',
    updatedAt: '2026-06-01'
  };

  function setup(overrides: Partial<BudgetFormModalData> = {}): ComponentFixture<BudgetFormModalComponent> {
    dialogRef = { close: jest.fn() };
    const data: BudgetFormModalData = {
      budget: null,
      availableCategories: categories,
      monthLabel: 'Junio 2026',
      ...overrides
    };

    TestBed.configureTestingModule({
      imports: [BudgetFormModalComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    const fixture = TestBed.createComponent(BudgetFormModalComponent);
    fixture.detectChanges();
    return fixture;
  }

  describe('create mode', () => {
    it('should title the modal "Nuevo presupuesto" with the month label', () => {
      const fixture = setup();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(fixture.componentInstance['isEditMode']()).toBe(false);
      expect(text).toContain('Nuevo presupuesto · Junio 2026');
      expect(text).toContain('Crear');
    });

    it('should start with an enabled, empty and invalid form', () => {
      const fixture = setup();
      const form = fixture.componentInstance['form'];

      expect(form.get('categoryId')!.enabled).toBe(true);
      expect(form.get('categoryId')!.value).toBeNull();
      expect(form.get('amount')!.value).toBeNull();
      expect(form.invalid).toBe(true);
    });

    it('should not close the dialog when submitting an invalid form', () => {
      const fixture = setup();

      fixture.componentInstance['onSubmit']();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should reject amounts below 1', () => {
      const fixture = setup();
      const form = fixture.componentInstance['form'];

      form.get('categoryId')!.setValue(1);
      form.get('amount')!.setValue(0);

      expect(form.invalid).toBe(true);

      form.get('amount')!.setValue(1);
      expect(form.valid).toBe(true);
    });

    it('should emit the categoryId and a numeric amount on submit', () => {
      const fixture = setup();
      const form = fixture.componentInstance['form'];

      form.get('categoryId')!.setValue(2);
      form.get('amount')!.setValue('350.75');

      fixture.componentInstance['onSubmit']();

      expect(dialogRef.close).toHaveBeenCalledWith({ categoryId: 2, amount: 350.75 });
      expect(typeof (dialogRef.close.mock.calls[0][0] as { amount: unknown }).amount).toBe('number');
    });
  });

  describe('edit mode', () => {
    it('should title the modal "Editar presupuesto" and show the fixed category', () => {
      const fixture = setup({ budget });
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(fixture.componentInstance['isEditMode']()).toBe(true);
      expect(text).toContain('Editar presupuesto · Junio 2026');
      expect(text).toContain('Súper');
      expect(text).toContain('Actualizar');
      expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
    });

    it('should disable the category control and prefill both values', () => {
      const fixture = setup({ budget });
      const form = fixture.componentInstance['form'];

      expect(form.get('categoryId')!.disabled).toBe(true);
      expect(form.get('categoryId')!.value).toBe(2);
      expect(form.get('amount')!.value).toBe(450);
      expect(form.valid).toBe(true);
    });

    it('should still emit the disabled categoryId via getRawValue on submit', () => {
      const fixture = setup({ budget });
      const form = fixture.componentInstance['form'];

      form.get('amount')!.setValue(600);
      fixture.componentInstance['onSubmit']();

      expect(dialogRef.close).toHaveBeenCalledWith({ categoryId: 2, amount: 600 });
    });

    it('should become invalid when the amount is cleared', () => {
      const fixture = setup({ budget });
      const form = fixture.componentInstance['form'];

      form.get('amount')!.setValue(null);
      fixture.componentInstance['onSubmit']();

      expect(form.invalid).toBe(true);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  it('should close with null on cancel', () => {
    const fixture = setup();

    fixture.componentInstance['onCancel']();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});
