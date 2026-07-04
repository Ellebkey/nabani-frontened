import { Component, ChangeDetectionStrategy, computed, signal, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MagueyAlertComponent, MagueyAlertType } from '@maguey/components/alert';

import { AuthService } from '@app/core/auth/auth.service';
import { FamilyStateService } from '@app/modules/family/services/state/family-state.service';
import { PillComponent, PillVariant } from '@shared/components/pill/pill.component';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatCardModule,
        MatChipsModule,
        MatIconModule,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MagueyAlertComponent,
        PillComponent,
    ]
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly familyState = inject(FamilyStateService);

  readonly username = this.authService.getUsername();
  readonly fullname = this.authService.getFullname();
  readonly roles = this.authService.getUserRoles() ?? [];

  get displayName(): string {
    return this.fullname || this.username || 'Mi cuenta';
  }

  get initials(): string {
    const parts = this.displayName.replace(/@.*$/, '').split(/[\s._-]+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  }

  private readonly roleLabels: Record<string, string> = {
    admin: 'Administrador',
    premium: 'Premium',
    free: 'Free',
    user: 'Usuario',
  };

  roleLabel(role: string): string {
    return this.roleLabels[role] ?? role;
  }

  rolePillVariant(role: string): PillVariant {
    return role === 'admin' ? 'brand' : 'neutral';
  }

  constructor() {
    this.familyState.ensureLoaded();
  }

  protected readonly isLoading = signal(false);
  protected readonly showAlert = signal(false);
  protected readonly alertConfig = signal<{ type: MagueyAlertType; message: string }>({
    type: 'success',
    message: '',
  });

  protected readonly changePasswordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly changePasswordFormEvents = toSignal(this.changePasswordForm.events);
  protected readonly changePasswordFormInvalid = computed(() => {
    this.changePasswordFormEvents();
    return this.changePasswordForm.invalid;
  });
  protected readonly showCurrentPasswordError = computed(() => this.controlErrorVisible('currentPassword'));
  protected readonly showNewPasswordError = computed(() => this.controlErrorVisible('newPassword'));
  protected readonly showConfirmPasswordError = computed(() => this.controlErrorVisible('confirmPassword'));
  protected readonly newPasswordErrors = computed(() => {
    this.changePasswordFormEvents();
    return this.changePasswordForm.get('newPassword')?.errors ?? null;
  });

  private controlErrorVisible(controlName: string): boolean {
    this.changePasswordFormEvents();
    const control = this.changePasswordForm.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected onChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.changePasswordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.alertConfig.set({ type: 'error', message: 'Las contraseñas no coinciden.' });
      this.showAlert.set(true);
      return;
    }

    this.isLoading.set(true);
    this.showAlert.set(false);
    this.changePasswordForm.disable();

    this.authService.changePassword(currentPassword, newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.changePasswordForm.enable();
          this.changePasswordForm.reset();
          this.alertConfig.set({ type: 'success', message: 'Contraseña actualizada correctamente.' });
          this.showAlert.set(true);
        },
        error: (err) => {
          this.changePasswordForm.enable();
          this.isLoading.set(false);
          const message = err.error?.error?.message?.includes('incorrect')
            ? 'La contraseña actual es incorrecta.'
            : 'Ocurrió un error al actualizar la contraseña. Intenta de nuevo.';
          this.alertConfig.set({ type: 'error', message });
          this.showAlert.set(true);
        },
      });
  }
}
