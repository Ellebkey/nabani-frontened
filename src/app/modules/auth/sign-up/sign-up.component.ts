import { Component, ChangeDetectionStrategy, computed, signal, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MagueyAlertComponent, MagueyAlertType } from '@maguey/components/alert';
import { magueyAnimations } from '@maguey/animations';
import { AuthService } from '@app/core/auth/auth.service';

@Component({
    selector: 'auth-sign-up',
    templateUrl: './sign-up.component.html',
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
export class SignUpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(false);
  protected readonly showAlert = signal(false);
  protected readonly alertConfig = signal<{ type: MagueyAlertType; message: string }>({
    type: 'success',
    message: '',
  });

  protected readonly signUpForm = this.fb.nonNullable.group({
    displayName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly signUpFormEvents = toSignal(this.signUpForm.events);
  protected readonly displayNameErrors = computed(() => {
    this.signUpFormEvents();
    const control = this.signUpForm.get('displayName');
    return control?.touched ? control.errors : null;
  });
  protected readonly emailErrors = computed(() => {
    this.signUpFormEvents();
    const control = this.signUpForm.get('email');
    return control?.touched ? control.errors : null;
  });
  protected readonly passwordErrors = computed(() => {
    this.signUpFormEvents();
    const control = this.signUpForm.get('password');
    return control?.touched ? control.errors : null;
  });

  protected onSubmit(): void {
    if (this.signUpForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.showAlert.set(false);
    this.signUpForm.disable();

    const { displayName, email, password } = this.signUpForm.getRawValue();

    this.authService.signup({
      username: email,
      email,
      password,
      displayName,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.alertConfig.set({
            type: 'success',
            message: 'Cuenta creada. Revisa tu correo electronico para verificar tu cuenta.',
          });
          this.showAlert.set(true);
        },
        error: () => {
          this.signUpForm.enable();
          this.isLoading.set(false);
          this.alertConfig.set({
            type: 'error',
            message: 'Ocurrió un error al crear la cuenta. Intenta de nuevo.',
          });
          this.showAlert.set(true);
        },
      });
  }
}
