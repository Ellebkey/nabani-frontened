import { Component, ChangeDetectionStrategy, computed, signal, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MagueyAlertComponent, MagueyAlertType } from '@maguey/components/alert';
import { magueyAnimations } from '@maguey/animations';
import { AuthService } from '@app/core/auth/auth.service';

@Component({
    selector: 'auth-forgot-password',
    templateUrl: './forgot-password.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: magueyAnimations,
    imports: [
        RouterLink,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MagueyAlertComponent,
    ]
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(false);
  protected readonly showAlert = signal(false);
  protected readonly alertConfig = signal<{ type: MagueyAlertType; message: string }>({
    type: 'success',
    message: '',
  });

  protected readonly forgotPasswordForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly forgotPasswordFormEvents = toSignal(this.forgotPasswordForm.events);
  protected readonly emailErrors = computed(() => {
    this.forgotPasswordFormEvents();
    return this.forgotPasswordForm.get('email')?.errors ?? null;
  });

  protected onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.showAlert.set(false);
    this.forgotPasswordForm.disable();

    const { email } = this.forgotPasswordForm.getRawValue();

    this.authService.requestPasswordReset(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.alertConfig.set({
            type: 'success',
            message: 'Si el correo esta registrado, recibiras un enlace para restablecer tu contraseña.',
          });
          this.showAlert.set(true);
        },
        error: () => {
          this.forgotPasswordForm.enable();
          this.isLoading.set(false);
          this.alertConfig.set({
            type: 'error',
            message: 'Ocurrió un error. Intenta de nuevo.',
          });
          this.showAlert.set(true);
        },
      });
  }
}
