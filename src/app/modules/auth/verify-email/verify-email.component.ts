import { Component, ChangeDetectionStrategy, signal, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MagueyAlertComponent, MagueyAlertType } from '@maguey/components/alert';
import { magueyAnimations } from '@maguey/animations';
import { AuthService } from '@app/core/auth/auth.service';

@Component({
    selector: 'auth-verify-email',
    templateUrl: './verify-email.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: magueyAnimations,
    imports: [
        RouterLink,
        MatButtonModule,
        MatProgressSpinnerModule,
        MagueyAlertComponent,
    ]
})
export class VerifyEmailComponent implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly showAlert = signal(false);
  protected readonly alertConfig = signal<{ type: MagueyAlertType; message: string }>({
    type: 'success',
    message: '',
  });

  ngOnInit(): void {
    const token = this.activatedRoute.snapshot.queryParamMap.get('token') || '';

    if (!token) {
      this.isLoading.set(false);
      this.alertConfig.set({
        type: 'error',
        message: 'El enlace de verificacion es invalido.',
      });
      this.showAlert.set(true);
      return;
    }

    this.authService.verifyEmail(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.alertConfig.set({
            type: 'success',
            message: 'Tu correo ha sido verificado exitosamente. Ya puedes iniciar sesion.',
          });
          this.showAlert.set(true);
        },
        error: () => {
          this.isLoading.set(false);
          this.alertConfig.set({
            type: 'error',
            message: 'El enlace de verificacion es invalido o ha expirado.',
          });
          this.showAlert.set(true);
        },
      });
  }
}
