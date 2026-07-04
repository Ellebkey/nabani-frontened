import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { TagFormModalComponent } from './tag-form-modal.component';
import { ITag } from '@shared/interfaces/tag.model';

const FIRST_PALETTE_COLOR = '#3B5F82'; // Marino, first muted

describe('TagFormModalComponent', () => {
  let dialogRef: { close: jest.Mock };

  const viajeTag: ITag = { id: 7, name: 'Viaje', color: '#3B82F6', description: 'Vacaciones' };

  function setup(data: ITag | null = null): ComponentFixture<TagFormModalComponent> {
    dialogRef = { close: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TagFormModalComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    const fixture = TestBed.createComponent(TagFormModalComponent);
    fixture.detectChanges();
    return fixture;
  }

  describe('create mode', () => {
    it('should title the modal "Nueva Etiqueta" with a "Crear" action', () => {
      const fixture = setup();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(fixture.componentInstance['isEditMode']()).toBe(false);
      expect(text).toContain('Nueva etiqueta');
      expect(text).toContain('Crear');
      expect(text).toContain('Vista previa');
    });

    it('should default to the first palette color and an invalid form', () => {
      const fixture = setup();
      const component = fixture.componentInstance;

      expect(component['selectedColor']()).toBe(FIRST_PALETTE_COLOR);
      expect(component.tagForm.get('color')!.value).toBe(FIRST_PALETTE_COLOR);
      expect(component.tagForm.get('name')!.value).toBe('');
      expect(component.tagForm.invalid).toBe(true);
      expect(component['isSubmitting']()).toBe(false);
    });

    it('should render the 16 palette swatches and disable submit while invalid', () => {
      const fixture = setup();

      const swatches = fixture.nativeElement.querySelectorAll('form button[type="button"]');
      // The 16 swatches are the only type="button" inside the form (Cancelar lives in the footer)
      expect(swatches.length).toBe(16);

      const submitButton = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
      ).find(b => (b.textContent ?? '').includes('Crear'))!;
      expect(submitButton.disabled).toBe(true);
    });

    it('should validate name length and description max length', () => {
      const fixture = setup();
      const form = fixture.componentInstance.tagForm;

      form.get('name')!.setValue('A');
      expect(form.get('name')!.hasError('minlength')).toBe(true);

      form.get('name')!.setValue('A'.repeat(101));
      expect(form.get('name')!.hasError('maxlength')).toBe(true);

      form.get('description')!.setValue('x'.repeat(501));
      expect(form.get('description')!.hasError('maxlength')).toBe(true);

      form.get('name')!.setValue('Navidad');
      form.get('description')!.setValue('');
      expect(form.valid).toBe(true);
    });

    it('should reject colors that are not 6-digit hex codes', () => {
      const fixture = setup();
      const color = fixture.componentInstance.tagForm.get('color')!;

      color.setValue('rojo');
      expect(color.hasError('pattern')).toBe(true);

      color.setValue('#FFF');
      expect(color.hasError('pattern')).toBe(true);

      color.setValue('#A1b2C3');
      expect(color.valid).toBe(true);
    });

    it('should sync the signal and the form control when a palette color is picked', () => {
      const fixture = setup();
      const component = fixture.componentInstance;

      component['selectColor']('#22C55E');

      expect(component['selectedColor']()).toBe('#22C55E');
      expect(component.tagForm.get('color')!.value).toBe('#22C55E');
    });

    it('should not close the dialog when the form is invalid', fakeAsync(() => {
      const fixture = setup();

      fixture.componentInstance['onSubmit']();
      tick(300);

      expect(fixture.componentInstance['isSubmitting']()).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    }));

    it('should close with the trimmed payload after the 300ms UX delay', fakeAsync(() => {
      const fixture = setup();
      const component = fixture.componentInstance;
      component.tagForm.patchValue({ name: '  Navidad  ', description: '  Regalos  ' });
      component['selectColor']('#22C55E');

      component['onSubmit']();

      expect(component['isSubmitting']()).toBe(true);
      expect(dialogRef.close).not.toHaveBeenCalled();

      tick(300);

      expect(dialogRef.close).toHaveBeenCalledWith({
        name: 'Navidad',
        color: '#22C55E',
        description: 'Regalos'
      });
    }));

    it('should send a null description when it is empty or whitespace', fakeAsync(() => {
      const fixture = setup();
      const component = fixture.componentInstance;
      component.tagForm.patchValue({ name: 'Navidad', description: '   ' });

      component['onSubmit']();
      tick(300);

      expect(dialogRef.close).toHaveBeenCalledWith({
        name: 'Navidad',
        color: FIRST_PALETTE_COLOR,
        description: null
      });
    }));

    it('should ignore a second submit while the first one is in flight', fakeAsync(() => {
      const fixture = setup();
      const component = fixture.componentInstance;
      component.tagForm.patchValue({ name: 'Navidad' });

      component['onSubmit']();
      component['onSubmit']();
      tick(300);

      expect(dialogRef.close).toHaveBeenCalledTimes(1);
    }));
  });

  describe('edit mode', () => {
    it('should title the modal "Editar Etiqueta" with an "Actualizar" action', () => {
      const fixture = setup(viajeTag);
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(fixture.componentInstance['isEditMode']()).toBe(true);
      expect(text).toContain('Editar etiqueta');
      expect(text).toContain('Actualizar');
    });

    it('should prefill the form and select the tag color', () => {
      const fixture = setup(viajeTag);
      const component = fixture.componentInstance;

      expect(component.tagForm.value).toEqual({
        name: 'Viaje',
        color: '#3B82F6',
        description: 'Vacaciones'
      });
      expect(component['selectedColor']()).toBe('#3B82F6');
      expect(component.tagForm.valid).toBe(true);
    });

    it('should default a missing description to an empty string', () => {
      const fixture = setup({ id: 8, name: 'Casa', color: '#22C55E' });

      expect(fixture.componentInstance.tagForm.get('description')!.value).toBe('');
    });

    it('should close with the updated values on submit', fakeAsync(() => {
      const fixture = setup(viajeTag);
      const component = fixture.componentInstance;
      component.tagForm.patchValue({ name: 'Viaje 2027' });
      component['selectColor']('#EC4899');

      component['onSubmit']();
      tick(300);

      expect(dialogRef.close).toHaveBeenCalledWith({
        name: 'Viaje 2027',
        color: '#EC4899',
        description: 'Vacaciones'
      });
    }));
  });

  it('should close with null on cancel', () => {
    const fixture = setup();

    fixture.componentInstance['onCancel']();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});
