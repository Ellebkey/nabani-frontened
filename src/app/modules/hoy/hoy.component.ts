import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { forkJoin } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { PillComponent } from '@shared/components/pill/pill.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

import { HoyService } from './hoy.service';
import {
  DashboardAttention,
  DashboardToday,
  DashboardWeek,
  OverduePayment,
  formatLongDate,
  todayIso,
  weekdayLabel,
} from './hoy.models';

/**
 * Hoy (dashboard) — the daily command center (design-spec §4.1, §8.1).
 * Pipeline of the day, "Requiere atención" queue, week strip, and (admin only)
 * the income / active-patients / urgent-collection cards.
 */
@Component({
  selector: 'app-hoy',
  templateUrl: './hoy.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RouterLink, CurrencyPipe, MatButton, MatIcon, PillComponent, EmptyStateComponent],
})
export class HoyComponent implements OnInit {
  private readonly hoyService = inject(HoyService);
  private readonly authService = inject(AuthService);

  private readonly date = todayIso();
  protected readonly longDate = formatLongDate(this.date);
  protected readonly weekdayLabel = weekdayLabel;
  protected readonly skeletonCols = [1, 2, 3, 4];

  protected readonly today = signal<DashboardToday | null>(null);
  protected readonly attention = signal<DashboardAttention | null>(null);
  protected readonly week = signal<DashboardWeek | null>(null);
  protected readonly isLoaded = signal(false);

  protected readonly isAdmin = computed(() => this.authService.isAdmin());

  protected readonly attentionCount = computed(() => {
    const a = this.attention();
    if (!a) {
      return 0;
    }
    return a.conflicts.length + a.overduePayments.length + a.expiringPackages.length + a.missingMenu.length;
  });

  protected readonly hasAttention = computed(() => this.attentionCount() > 0);

  protected readonly missingMenuNames = computed(() =>
    (this.attention()?.missingMenu ?? []).map(m => m.patientName).join(' · '),
  );

  protected readonly topOverdue = computed<OverduePayment[]>(() =>
    [...(this.attention()?.overduePayments ?? [])]
      .sort((a, b) => b.agingDays - a.agingDays)
      .slice(0, 3),
  );

  ngOnInit(): void {
    forkJoin({
      today: this.hoyService.getToday(this.date),
      attention: this.hoyService.getAttention(this.date),
      week: this.hoyService.getWeek(this.date),
    }).subscribe({
      next: ({ today, attention, week }) => {
        this.today.set(today);
        this.attention.set(attention);
        this.week.set(week);
        this.isLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.isLoaded.set(true);
      },
    });
  }

  protected isToday(iso: string): boolean {
    return iso === this.date;
  }
}
