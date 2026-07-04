import { Component, ChangeDetectionStrategy, HostBinding, computed, input } from '@angular/core';

/** Nabani initials tile — patient/user identity, NO avatars (design-spec §2.13).
 *  sm=34px · base=42px · lg=52px · xl=56px, all on brand-tint with brand text. */
export type NbInitSize = 'sm' | 'base' | 'lg' | 'xl';

@Component({
  selector: 'nb-init',
  template: '{{ display() }}',
  styleUrl: './nb-init.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class NbInitComponent {
  /** Full name — initials are derived from it when `initials` is not given. */
  readonly name = input<string>('');
  /** Explicit initials override (e.g. already computed upstream). */
  readonly initials = input<string>();
  readonly size = input<NbInitSize>('base');

  protected readonly display = computed(() => this.initials() || this.deriveInitials(this.name()));

  @HostBinding('class')
  get hostClasses(): string {
    return this.size();
  }

  private deriveInitials(name: string): string {
    const parts = name.replace(/@.*$/, '').split(/[\s._-]+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  }
}
