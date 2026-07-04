import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HotToastService } from '@ngxpert/hot-toast';

import { FamilyApiService } from '../services/api/family-api.service';
import { FamilyStateService } from '../services/state/family-state.service';

@Component({
    selector: 'app-accept-invite',
    templateUrl: './accept-invite.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule
    ]
})
export class AcceptInviteComponent {
  private readonly api = inject(FamilyApiService);
  private readonly familyState = inject(FamilyStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(HotToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly accepting = signal(false);
  protected readonly tokenControl = new FormControl(
    this.route.snapshot.queryParamMap.get('token') ?? '',
    [Validators.required, Validators.minLength(10)]
  );

  protected acceptInvite(): void {
    if (this.tokenControl.invalid || this.accepting()) {
      return;
    }

    this.accepting.set(true);

    this.api.acceptInvite((this.tokenControl.value as string).trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (partnership) => {
          this.familyState.setPartnership(partnership);
          this.toast.success('¡Bienvenido al hogar!');
          this.router.navigate(['/family/spending']);
        },
        error: (error) => {
          const messagesByStatus: Record<number, string> = {
            404: 'Invitación no válida o revocada',
            409: 'Ya perteneces a un hogar activo',
            422: 'La invitación expiró o el hogar ya está completo'
          };
          this.toast.error(messagesByStatus[error?.status] ?? 'Error al aceptar la invitación');
          this.accepting.set(false);
        }
      });
  }
}
