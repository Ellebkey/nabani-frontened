import { Component, Input, ChangeDetectionStrategy, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'mg-empty-state',
    template: `
    <div class="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-tint text-brand">
      <mat-icon class="text-current icon-size-7" [svgIcon]="icon()"></mat-icon>
    </div>
    <h3 class="text-[15px] font-semibold text-ink">{{ title() }}</h3>
    @if (message) {
      <p class="mx-auto mb-[18px] mt-1 max-w-sm text-[13px] text-ink-3">{{ message }}</p>
    }
    <ng-content></ng-content>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule],
    host: {
        class: 'block px-6 py-14 text-center',
    }
})
export class EmptyStateComponent {
  readonly icon = input('heroicons_outline:inbox');
  readonly title = input('');
  @Input() message?: string;
}
