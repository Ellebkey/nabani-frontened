import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

import { ProduccionService } from '../produccion.service';
import { ProduccionNavComponent } from '../components/produccion-nav.component';
import { DateFieldComponent } from '../components/date-field.component';
import {
  ShoppingList,
  MarginPerPackage,
  foodGroupMeta,
  formatLongDate,
  todayISO,
} from '../produccion.models';

type ShoppingMode = 'hoy' | 'semana';

interface MarginBar extends MarginPerPackage {
  color: string;
  widthPercent: number;
}

/** Compras y costos (design-spec §4.9) ★ — shopping list (Hoy/Semana) with
 *  client-side "bought" checkboxes, cost per dish, and margin per package. */
@Component({
  selector: 'app-compras',
  templateUrl: './compras.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe, DecimalPipe, MatButton, MatIcon,
    ChipComponent, ChipRowComponent, EmptyStateComponent,
    ProduccionNavComponent, DateFieldComponent,
  ],
})
export class ComprasComponent implements OnInit {
  private produccionService = inject(ProduccionService);

  readonly list = signal<ShoppingList | null>(null);
  readonly isDataLoaded = signal(false);
  readonly selectedDate = signal(todayISO());
  readonly mode = signal<ShoppingMode>('hoy');
  // Client-side "bought" state (design-spec §4.9): checked = struck through.
  readonly checkedIds = signal<ReadonlySet<number>>(new Set<number>());

  protected readonly foodGroupMeta = foodGroupMeta;

  readonly groups = computed(() => this.list()?.groups ?? []);
  readonly estimated = computed(() => this.list()?.estimated ?? 0);
  readonly costPerDish = computed(() => this.list()?.costPerDish ?? []);
  readonly alertPackages = computed(() => this.marginPerPackage().filter(m => m.alert));
  readonly hasAlert = computed(() => this.alertPackages().length > 0);
  readonly longDate = computed(() => formatLongDate(this.selectedDate()));
  readonly shortDate = computed(() => this.formatShort(this.selectedDate()));

  readonly heroLabel = computed(() =>
    this.mode() === 'semana' ? 'Compra estimada de la semana' : 'Compra estimada de hoy',
  );

  readonly weekChipLabel = computed(() => {
    const data = this.list();
    if (this.mode() === 'semana' && data?.startDate && data?.endDate) {
      return `Semana ${this.formatShort(data.startDate)}–${this.formatShort(data.endDate)}`;
    }
    return 'Semana';
  });

  readonly marginPerPackage = computed<MarginBar[]>(() =>
    (this.list()?.marginPerPackage ?? []).map(m => ({
      ...m,
      color: m.alert ? '#C9A45C' : '#3E7C74',
      widthPercent: Math.max(2, Math.min(100, m.marginPercent ?? 0)),
    })),
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isDataLoaded.set(false);
    const query = this.mode() === 'semana'
      ? { week: this.selectedDate() }
      : { date: this.selectedDate() };
    this.produccionService.getShoppingList(query).subscribe({
      next: (response) => {
        this.list.set(response);
        this.isDataLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.list.set(null);
        this.isDataLoaded.set(true);
      },
    });
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
    this.loadData();
  }

  setMode(mode: ShoppingMode): void {
    if (this.mode() === mode) {
      return;
    }
    this.mode.set(mode);
    this.loadData();
  }

  isChecked(ingredientId: number): boolean {
    return this.checkedIds().has(ingredientId);
  }

  toggleItem(ingredientId: number): void {
    this.checkedIds.update(current => {
      const next = new Set(current);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  }

  print(): void {
    window.print();
  }

  private formatShort(iso: string): string {
    if (!iso) {
      return '';
    }
    try {
      return format(parseISO(iso), 'd MMM', { locale: es });
    } catch {
      return iso;
    }
  }
}
