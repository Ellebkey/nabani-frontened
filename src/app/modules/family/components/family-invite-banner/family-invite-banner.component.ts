import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { FamilyStateService } from '../../services/state/family-state.service';
import { TileComponent } from '@shared/components/tile/tile.component';
import { PillComponent } from '@shared/components/pill/pill.component';

const DISMISSED_STORAGE_KEY = 'family-invite-banner-dismissed';

@Component({
    selector: 'app-family-invite-banner',
    templateUrl: './family-invite-banner.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        MatButtonModule,
        MatIconModule,
        TileComponent,
        PillComponent
    ]
})
export class FamilyInviteBannerComponent {
  protected readonly familyState = inject(FamilyStateService);

  protected readonly dismissed = signal(localStorage.getItem(DISMISSED_STORAGE_KEY) === 'true');
  protected readonly isPremium = this.familyState.isPremium();

  constructor() {
    this.familyState.ensureLoaded();
  }

  protected dismiss(): void {
    localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
    this.dismissed.set(true);
  }
}
