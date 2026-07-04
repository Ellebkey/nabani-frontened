import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { CategoryFormModalComponent } from './category-form-modal.component';
import { ICategory } from '@shared/interfaces/common.model';

describe('CategoryFormModalComponent', () => {
  let dialogRef: { close: jest.Mock };

  const hogar: ICategory = {
    id: 1,
    name: 'Hogar',
    colorPalette: '#3B82F6',
    enabledTiers: ['free', 'premium'],
    subcategories: []
  };

  function setup(data: ICategory | null = null): ComponentFixture<CategoryFormModalComponent> {
    dialogRef = { close: jest.fn() };

    TestBed.configureTestingModule({
      imports: [CategoryFormModalComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    const fixture = TestBed.createComponent(CategoryFormModalComponent);
    fixture.detectChanges();
    return fixture;
  }

  describe('create mode', () => {
    it('should title the modal "Nueva Categoría" with a "Crear" action', () => {
      const fixture = setup();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(fixture.componentInstance['isEditMode']()).toBe(false);
      expect(text).toContain('Nueva categoría');
      expect(text).toContain('Crear');
      expect(text).toContain('Color *');
    });

    it('should start with an empty invalid form, no color and a disabled submit button', () => {
      const fixture = setup();
      const component = fixture.componentInstance;

      expect(component.form.get('name')!.value).toBe('');
      expect(component.form.invalid).toBe(true);
      expect(component['selectedColor']()).toBeNull();

      const submitButton = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
      ).find(b => (b.textContent ?? '').includes('Crear'))!;
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

    it('should close with the trimmed name and no colorPalette when no color is picked', () => {
      const fixture = setup();
      fixture.componentInstance.form.get('name')!.setValue('  Mascotas  ');

      fixture.componentInstance['onSubmit']();

      expect(dialogRef.close).toHaveBeenCalledWith({ name: 'Mascotas', colorPalette: undefined });
    });

    it('should include the selected color in the submit payload', () => {
      const fixture = setup();
      fixture.componentInstance.form.get('name')!.setValue('Mascotas');
      fixture.componentInstance['selectColor']('#22C55E');

      fixture.componentInstance['onSubmit']();

      expect(dialogRef.close).toHaveBeenCalledWith({ name: 'Mascotas', colorPalette: '#22C55E' });
    });

    it('should keep the color selected when it is picked twice (color is required)', () => {
      const fixture = setup();
      const component = fixture.componentInstance;

      component['selectColor']('#22C55E');
      expect(component['selectedColor']()).toBe('#22C55E');

      component['selectColor']('#22C55E');
      expect(component['selectedColor']()).toBe('#22C55E');
    });

    it('should switch the selection when a different color is picked', () => {
      const fixture = setup();
      const component = fixture.componentInstance;

      component['selectColor']('#22C55E');
      component['selectColor']('#EF4444');

      expect(component['selectedColor']()).toBe('#EF4444');
    });

    it('should render the 16 palette colors as buttons', () => {
      const fixture = setup();

      const swatches = fixture.nativeElement.querySelectorAll('mg-color-swatches button');
      expect(swatches.length).toBe(16);
    });
  });

  describe('edit mode', () => {
    it('should title the modal "Editar Categoría" with an "Actualizar" action', () => {
      const fixture = setup(hogar);
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(fixture.componentInstance['isEditMode']()).toBe(true);
      expect(text).toContain('Editar categoría');
      expect(text).toContain('Actualizar');
    });

    it('should prefill the name and the selected color from the category', () => {
      const fixture = setup(hogar);
      const component = fixture.componentInstance;

      expect(component.form.get('name')!.value).toBe('Hogar');
      expect(component['selectedColor']()).toBe('#3B82F6');
      expect(component.form.valid).toBe(true);
    });

    it('should keep a null selection for a category without color', () => {
      const fixture = setup({ ...hogar, colorPalette: null });

      expect(fixture.componentInstance['selectedColor']()).toBeNull();
    });

    it('should close with the updated name and existing color on submit', () => {
      const fixture = setup(hogar);
      fixture.componentInstance.form.get('name')!.setValue('Hogar y Jardín');

      fixture.componentInstance['onSubmit']();

      expect(dialogRef.close).toHaveBeenCalledWith({ name: 'Hogar y Jardín', colorPalette: '#3B82F6' });
    });

    it('should keep the current color when it is re-picked (no deselection)', () => {
      const fixture = setup(hogar);
      fixture.componentInstance['selectColor']('#3B82F6');

      fixture.componentInstance['onSubmit']();

      expect(dialogRef.close).toHaveBeenCalledWith({ name: 'Hogar', colorPalette: '#3B82F6' });
    });
  });

  it('should close with null on cancel', () => {
    const fixture = setup();

    fixture.componentInstance['onCancel']();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});
