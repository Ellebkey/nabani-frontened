import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { FamilyStateService } from '../../services/state/family-state.service';

@Component({
    selector: 'app-no-partnership',
    templateUrl: './no-partnership.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule
    ]
})
export class NoPartnershipComponent {
  private readonly familyState = inject(FamilyStateService);

  protected readonly loading = this.familyState.loading;
  protected readonly isPremium = this.familyState.isPremium();
  protected readonly nameControl = new FormControl('', [Validators.maxLength(100)]);

  protected createPartnership(): void {
    if (this.nameControl.invalid || this.loading()) {
      return;
    }
    this.familyState.createPartnership(this.nameControl.value ?? undefined);
  }
}
