import { Component, ChangeDetectionStrategy, computed, signal, DestroyRef, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MagueyAlertComponent, MagueyAlertType } from '@maguey/components/alert';
import { magueyAnimations } from '@maguey/animations';
import { AuthService } from '@app/core/auth/auth.service';

@Component({
    selector: 'auth-sign-in',
    templateUrl: './sign-in.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: magueyAnimations,
    imports: [
        RouterLink,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MagueyAlertComponent,
    ]
})
export class SignInComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(false);
  protected readonly isResending = signal(false);
  protected readonly showAlert = signal(false);
  protected readonly showResendLink = signal(false);
  protected readonly alertConfig = signal<{ type: MagueyAlertType; message: string }>({
    type: 'success',
    message: '',
  });

  protected readonly signInForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly signInFormEvents = toSignal(this.signInForm.events);
  protected readonly showPasswordRequired = computed(() => {
    this.signInFormEvents();
    const control = this.signInForm.get('password');
    return !!control && control.hasError('required') && control.touched;
  });

  protected readonly usernameErrors = computed(() => {
    this.signInFormEvents();
    const control = this.signInForm.get('username');
    return control?.touched ? control.errors : null;
  });

  protected onSubmit(): void {
    if (this.signInForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.showAlert.set(false);
    this.signInForm.disable();

    const { username, password, rememberMe } = this.signInForm.getRawValue();

    this.authService.login({ username, password, rememberMe })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.authService.setUser(result.token, result.refreshToken, result.roles, result.expiresIn, result.username, (result as any).fullname);
          const redirectURL = this.activatedRoute.snapshot.queryParamMap.get('redirectURL') || '/dashboard';
          this.router.navigateByUrl(redirectURL);
        },
        error: (err: HttpErrorResponse) => {
          this.signInForm.enable();
          this.isLoading.set(false);

          const isUnverified = err.error?.error?.message?.includes('verify your email');

          if (isUnverified) {
            this.alertConfig.set({
              type: 'warning',
              message: 'Tu correo no ha sido verificado. Revisa tu bandeja de entrada.',
            });
            this.showResendLink.set(true);
          } else {
            this.alertConfig.set({
              type: 'error',
              message: 'Correo o contraseña incorrectos',
            });
            this.showResendLink.set(false);
          }

          this.showAlert.set(true);
        },
      });
  }

  protected resendVerification(): void {
    const email = this.signInForm.getRawValue().username;
    if (!email) {
      return;
    }

    this.isResending.set(true);

    this.authService.resendVerificationEmail(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isResending.set(false);
          this.alertConfig.set({
            type: 'success',
            message: 'Correo de verificacion reenviado. Revisa tu bandeja de entrada.',
          });
          this.showResendLink.set(false);
        },
        error: () => {
          this.isResending.set(false);
          this.alertConfig.set({
            type: 'error',
            message: 'No se pudo reenviar el correo. Intenta de nuevo.',
          });
        },
      });
  }
}
