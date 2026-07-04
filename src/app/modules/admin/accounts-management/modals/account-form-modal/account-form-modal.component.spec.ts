import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AccountFormModalComponent } from './account-form-modal.component';
import { IAccount, DEFAULT_ACCOUNT_COLORS } from '@shared/interfaces/account.model';

const accountFixture: IAccount = {
  id: 'a-1',
  name: 'Nu',
  currentAmount: 8200,
  value: 0,
  showSection: false,
  colorPalette: '#6200a3',
  isPrimary: false,
  disable: false,
  ownerId: 'u-1'
};

describe('AccountFormModalComponent', () => {
  let dialogRef: { close: jest.Mock };

  function setup(data: IAccount | null = null): ComponentFixture<AccountFormModalComponent> {
    dialogRef = { close: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AccountFormModalComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    const fixture = TestBed.createComponent(AccountFormModalComponent);
    fixture.detectChanges();
    return fixture;
  }

  describe('create mode', () => {
    it('should title the modal "Nueva Cuenta" and offer "Crear"', () => {
      const fixture = setup();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(fixture.componentInstance['isEditMode']()).toBe(false);
      expect(fixture.componentInstance['modalTitle']()).toBe('Nueva cuenta');
      expect(text).toContain('Nueva cuenta');
      expect(text).toContain('Crear');
      expect(text).not.toContain('Actualizar');
    });

    it('should start with defaults, an enabled balance and an invalid form', () => {
      const fixture = setup();
      const form = fixture.componentInstance.accountForm;

      expect(form.value).toEqual({
        name: '',
        currentAmount: 0,
        colorPalette: DEFAULT_ACCOUNT_COLORS[0]
      });
      expect(form.get('currentAmount')!.enabled).toBe(true);
      expect(fixture.componentInstance['selectedColor']()).toBe(DEFAULT_ACCOUNT_COLORS[0]);
      expect(form.invalid).toBe(true);
    });

    it('should validate the name length boundaries', () => {
      const fixture = setup();
      const name = fixture.componentInstance.accountForm.get('name')!;

      expect(name.hasError('required')).toBe(true);

      name.setValue('a');
      expect(name.hasError('minlength')).toBe(true);

      name.setValue('a'.repeat(51));
      expect(name.hasError('maxlength')).toBe(true);

      name.setValue('Nu');
      expect(name.valid).toBe(true);
    });

    it('should disable the submit button until the form is valid', () => {
      const fixture = setup();
      const submitButton = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
      ).find(b => (b.textContent ?? '').includes('Crear'))!;

      expect(submitButton.disabled).toBe(true);

      fixture.componentInstance.accountForm.patchValue({ name: 'Bancomer' });
      // Clicking a swatch (real listener) marks the OnPush view for refresh
      (fixture.nativeElement.querySelector('mg-color-swatches button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(submitButton.disabled).toBe(false);
    });

    it('should not close when submitting an invalid form', () => {
      const fixture = setup();

      fixture.componentInstance['onSubmit']();

      expect(fixture.componentInstance['isSubmitting']()).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close after 500ms with the trimmed name, parsed balance and color', fakeAsync(() => {
      const fixture = setup();
      const component = fixture.componentInstance;
      component.accountForm.patchValue({ name: '  Bancomer  ', currentAmount: '2500.75' });
      component['selectColor']('#ff3c7e');

      component['onSubmit']();

      expect(component['isSubmitting']()).toBe(true);
      expect(dialogRef.close).not.toHaveBeenCalled();

      // A second submit while submitting must be ignored
      component['onSubmit']();
      tick(500);

      expect(dialogRef.close).toHaveBeenCalledTimes(1);
      expect(dialogRef.close).toHaveBeenCalledWith({
        name: 'Bancomer',
        currentAmount: 2500.75,
        colorPalette: '#ff3c7e'
      });
    }));

    it('should keep a zero balance as 0 in the payload', fakeAsync(() => {
      const fixture = setup();
      fixture.componentInstance.accountForm.patchValue({ name: 'Efectivo', currentAmount: 0 });

      fixture.componentInstance['onSubmit']();
      tick(500);

      expect(dialogRef.close).toHaveBeenCalledWith({
        name: 'Efectivo',
        currentAmount: 0,
        colorPalette: DEFAULT_ACCOUNT_COLORS[0]
      });
    }));
  });

  describe('color selection', () => {
    it('should sync the signal and the form control', () => {
      const fixture = setup();

      fixture.componentInstance['selectColor']('#10b981');

      expect(fixture.componentInstance['selectedColor']()).toBe('#10b981');
      expect(fixture.componentInstance.accountForm.get('colorPalette')!.value).toBe('#10b981');
    });
  });

  describe('edit mode', () => {
    it('should title the modal "Editar Cuenta", patch values and disable the balance', () => {
      const fixture = setup(accountFixture);
      const form = fixture.componentInstance.accountForm;

      expect(fixture.componentInstance['isEditMode']()).toBe(true);
      expect(fixture.componentInstance['modalTitle']()).toBe('Editar cuenta');
      expect(form.get('name')!.value).toBe('Nu');
      expect(form.get('currentAmount')!.value).toBe(8200);
      expect(form.get('currentAmount')!.disabled).toBe(true);
      expect(form.get('colorPalette')!.value).toBe('#6200a3');
      expect(fixture.componentInstance['selectedColor']()).toBe('#6200a3');
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Actualizar');
    });

    it('should close with only the name and color (no balance) on submit', fakeAsync(() => {
      const fixture = setup(accountFixture);
      fixture.componentInstance.accountForm.patchValue({ name: ' Nu Morada ' });

      fixture.componentInstance['onSubmit']();
      tick(500);

      expect(dialogRef.close).toHaveBeenCalledWith({
        name: 'Nu Morada',
        colorPalette: '#6200a3'
      });
      expect(dialogRef.close.mock.calls[0][0]).not.toHaveProperty('currentAmount');
    }));
  });

  it('should close with null on cancel', () => {
    const fixture = setup();

    fixture.componentInstance['onCancel']();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});
