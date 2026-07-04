import { Component, inject, signal, computed, effect, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HotToastService } from '@ngxpert/hot-toast';
import { forkJoin } from 'rxjs';
import { addMonths, format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

import { FamilyApiService } from '../services/api/family-api.service';
import { FamilyStateService } from '../services/state/family-state.service';
import { NoPartnershipComponent } from '../components/no-partnership/no-partnership.component';
import { ISharedSpending, ISharedTicket } from '../models/family.model';
import { TransactionRowComponent } from '@shared/components/transaction-row/transaction-row.component';
import { DateRowComponent } from '@shared/components/transaction-row/date-row.component';
import { TileComponent } from '@shared/components/tile/tile.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { RowSkeletonComponent } from '@shared/components/skeleton/row-skeleton.component';

interface TicketDateGroup {
  dateLabel: string;
  tickets: ISharedTicket[];
  total: number;
}

@Component({
    selector: 'app-shared-spending',
    templateUrl: './shared-spending.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CurrencyPipe,
        DatePipe,
        MatButtonModule,
        MatIconModule,
        NoPartnershipComponent,
        TransactionRowComponent,
        DateRowComponent,
        TileComponent,
        PillComponent,
        EmptyStateComponent,
        RowSkeletonComponent
    ]
})
export class SharedSpendingComponent {
  private readonly api = inject(FamilyApiService);
  private readonly toast = inject(HotToastService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly familyState = inject(FamilyStateService);

  protected readonly month = signal(new Date());
  protected readonly loading = signal(false);
  protected readonly spending = signal<ISharedSpending>({ rows: [], total: 0 });
  protected readonly tickets = signal<ISharedTicket[]>([]);

  protected readonly pendingTotal = computed(() =>
    this.tickets()
      .filter(ticket => ticket.pendingSettlement)
      .reduce((sum, ticket) => sum + ticket.ticketTotal, 0)
  );

  protected readonly monthLabel = computed(() => {
    const label = format(this.month(), 'MMMM yyyy', { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  protected readonly periodMonth = computed(() => format(this.month(), 'yyyy-MM'));

  protected readonly maxCategoryTotal = computed(() =>
    Math.max(...this.spending().rows.map(row => row.total), 1)
  );

  protected readonly hasMovements = computed(() => this.spending().rows.length > 0);

  protected readonly myUserId = computed(() => this.familyState.currentMember()?.userId ?? '');
  protected readonly memberNames = this.familyState.memberNamesById;

  protected readonly expanded = signal<Set<number>>(new Set());
  protected readonly showAllCategories = signal(false);

  protected readonly ticketGroups = computed<TicketDateGroup[]>(() => {
    const groups = new Map<string, TicketDateGroup>();
    for (const ticket of this.tickets()) {
      const dateLabel = (ticket.expenseDate || '').slice(0, 10);
      const group = groups.get(dateLabel) ?? { dateLabel, tickets: [], total: 0 };
      group.tickets.push(ticket);
      group.total += Number(ticket.ticketTotal || 0);
      groups.set(dateLabel, group);
    }
    return [...groups.values()].sort((a, b) => b.dateLabel.localeCompare(a.dateLabel));
  });

  private readonly categoryColors = computed(() => {
    const map = new Map<string, string>();
    for (const row of this.spending().rows) {
      if (row.categoryName && row.colorPalette) {
        map.set(row.categoryName, row.colorPalette);
      }
    }
    return map;
  });

  protected readonly visibleCategories = computed(() =>
    this.showAllCategories() ? this.spending().rows : this.spending().rows.slice(0, 6)
  );

  protected isExpanded(expenseId: number): boolean {
    return this.expanded().has(expenseId);
  }

  protected toggleExpanded(expenseId: number): void {
    this.expanded.update(set => {
      const next = new Set(set);
      if (next.has(expenseId)) {
        next.delete(expenseId);
      } else {
        next.add(expenseId);
      }
      return next;
    });
  }

  protected toggleShowAllCategories(): void {
    this.showAllCategories.update(value => !value);
  }

  protected ticketCategory(ticket: ISharedTicket): string {
    return ticket.items[0]?.categoryName ?? '';
  }

  protected ticketColor(ticket: ISharedTicket): string {
    return this.categoryColor(this.ticketCategory(ticket));
  }

  protected categoryColor(categoryName: string): string {
    return this.categoryColors().get(categoryName) ?? '#5F7386';
  }

  protected memberLabel(ticket: ISharedTicket): string {
    return ticket.userId === this.myUserId() ? 'Tú' : (this.memberNames()[ticket.userId] || 'Pareja');
  }

  private readonly reloadOnChanges = effect(() => {
    const periodMonth = this.periodMonth();
    if (this.familyState.loaded() && this.familyState.hasPartnership()) {
      this.fetchData(periodMonth);
    }
  }, { allowSignalWrites: true });

  constructor() {
    this.familyState.ensureLoaded();
  }

  protected previousMonth(): void {
    this.month.update(current => subMonths(current, 1));
  }

  protected nextMonth(): void {
    this.month.update(current => addMonths(current, 1));
  }

  private fetchData(periodMonth: string): void {
    this.loading.set(true);

    forkJoin({
      spending: this.api.getSharedSpending(periodMonth),
      tickets: this.api.getSharedExpenses(periodMonth)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ spending, tickets }) => {
          this.spending.set(spending);
          this.tickets.set(tickets);
          this.loading.set(false);
        },
        error: () => {
          this.toast.error('Error al cargar los gastos compartidos');
          this.loading.set(false);
        }
      });
  }
}
