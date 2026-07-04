import { ChangeDetectionStrategy, Component } from '@angular/core';

import { NbInitComponent } from '@shared/components/nb-init/nb-init.component';

/**
 * Hoy (dashboard) — placeholder for the Phase 2 frame (design-spec §4.1).
 * Establishes the canonical page container + Nabani pagehead so future screens
 * slot straight in.
 */
@Component({
  selector: 'app-hoy',
  templateUrl: './hoy.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [NbInitComponent],
})
export class HoyComponent {
  /** e.g. "sábado 4 de julio" (es-MX). Static per load — fine for a zoneless read. */
  protected readonly today = this.formatToday();

  private formatToday(): string {
    const formatted = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
    return formatted.replace(/,/g, '');
  }
}
