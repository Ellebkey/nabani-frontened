import { Component, ChangeDetectionStrategy, computed, signal, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MagueyAlertComponent, MagueyAlertType } from '@maguey/components/alert';
import { magueyAnimations } from '@maguey/animations';
import { AuthService } from '@app/core/auth/auth.service';

@Component({
    selector: 'auth-reset-password',
    templateUrl: './reset-password.component.html',
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
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private token = '';

  protected readonly isLoading = signal(false);
  protected readonly showAlert = signal(false);
  protected readonly invalidToken = signal(false);
  protected readonly alertConfig = signal<{ type: MagueyAlertType; message: string }>({
    type: 'success',
    message: '',
  });

  protected readonly resetForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly resetFormEvents = toSignal(this.resetForm.events);
  protected readonly newPasswordErrors = computed(() => {
    this.resetFormEvents();
    return this.resetForm.get('newPassword')?.errors ?? null;
  });
  protected readonly confirmPasswordErrors = computed(() => {
    this.resetFormEvents();
    return this.resetForm.get('confirmPassword')?.errors ?? null;
  });

  ngOnInit(): void {
    this.token = this.activatedRoute.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.invalidToken.set(true);
    }
  }

  protected onSubmit(): void {
    if (this.resetForm.invalid) {
      return;
    }

    const { newPassword, confirmPassword } = this.resetForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.alertConfig.set({
        type: 'error',
        message: 'Las contraseñas no coinciden.',
      });
      this.showAlert.set(true);
      return;
    }

    this.isLoading.set(true);
    this.showAlert.set(false);
    this.resetForm.disable();

    this.authService.confirmPasswordReset(this.token, newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.alertConfig.set({
            type: 'success',
            message: 'Tu contraseña ha sido restablecida. Redirigiendo al inicio de sesion...',
          });
          this.showAlert.set(true);
          setTimeout(() => this.router.navigateByUrl('/authentication/login'), 3000);
        },
        error: () => {
          this.resetForm.enable();
          this.isLoading.set(false);
          this.alertConfig.set({
            type: 'error',
            message: 'El enlace es invalido o ha expirado. Solicita uno nuevo.',
          });
          this.showAlert.set(true);
        },
      });
  }
}
