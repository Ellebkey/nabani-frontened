import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { SubcategoryFormModalComponent, SubcategoryFormData } from './subcategory-form-modal.component';
import { ISubcategory } from '@shared/interfaces/common.model';

describe('SubcategoryFormModalComponent', () => {
  let dialogRef: { close: jest.Mock };

  const limpieza: ISubcategory = { id: 11, name: 'Limpieza', categoryId: 1, enabledTiers: ['free'] };

  function setup(overrides: Partial<SubcategoryFormData> = {}): ComponentFixture<SubcategoryFormModalComponent> {
    dialogRef = { close: jest.fn() };
    const data: SubcategoryFormData = {
      categoryId: 1,
      categoryName: 'Hogar',
      subcategory: null,
      ...overrides
    };

    TestBed.configureTestingModule({
      imports: [SubcategoryFormModalComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    const fixture = TestBed.createComponent(SubcategoryFormModalComponent);
    fixture.detectChanges();
    return fixture;
  }

  describe('create mode', () => {
    it('should title the modal with the parent category name', () => {
      const fixture = setup();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(fixture.componentInstance['isEditMode']()).toBe(false);
      expect(text).toContain('Nueva Subcategoría en "Hogar"');
      expect(text).toContain('Crear');
    });

    it('should start with an empty invalid form and a disabled submit button', () => {
      const fixture = setup();

      expect(fixture.componentInstance.form.get('name')!.value).toBe('');
      expect(fixture.componentInstance.form.invalid).toBe(true);

      const submitButton = fixture.nativeElement.querySelector('button[color="primary"]') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });

    it('should validate the name length boundaries', () => {
      const fixture = setup();
      const name = fixture.componentInstance.form.get('name')!;

      name.setValue('A');
      expect(name.hasError('minlength')).toBe(true);

      name.setValue('A'.repeat(101));
      expect(name.hasError('maxlength')).toBe(true);

      name.setValue('Ok');
      expect(name.valid).toBe(true);
    });

    it('should not close the dialog when submitting an invalid form', () => {
      const fixture = setup();

      fixture.componentInstance['onSubmit']();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close with the trimmed name and the parent categoryId on submit', () => {
      const fixture = setup();
      fixture.componentInstance.form.get('name')!.setValue('  Jardín  ');

      fixture.componentInstance['onSubmit']();

      expect(dialogRef.close).toHaveBeenCalledWith({ name: 'Jardín', categoryId: 1 });
    });
  });

  describe('edit mode', () => {
    it('should title the modal "Editar Subcategoría" with an "Actualizar" action', () => {
      const fixture = setup({ subcategory: limpieza });
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(fixture.componentInstance['isEditMode']()).toBe(true);
      expect(text).toContain('Editar Subcategoría');
      expect(text).toContain('Actualizar');
    });

    it('should prefill the name and be valid', () => {
      const fixture = setup({ subcategory: limpieza });

      expect(fixture.componentInstance.form.get('name')!.value).toBe('Limpieza');
      expect(fixture.componentInstance.form.valid).toBe(true);
    });

    it('should close with the renamed value and the categoryId on submit', () => {
      const fixture = setup({ subcategory: limpieza });
      fixture.componentInstance.form.get('name')!.setValue('Aseo');

      fixture.componentInstance['onSubmit']();

      expect(dialogRef.close).toHaveBeenCalledWith({ name: 'Aseo', categoryId: 1 });
    });
  });

  it('should close with null on cancel', () => {
    const fixture = setup();

    fixture.componentInstance['onCancel']();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});
