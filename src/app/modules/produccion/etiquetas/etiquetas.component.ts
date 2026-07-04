import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { TileComponent } from '@shared/components/tile/tile.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

import { ProduccionService } from '../produccion.service';
import { ProduccionNavComponent } from '../components/produccion-nav.component';
import { DateFieldComponent } from '../components/date-field.component';
import {
  DeliveryLabelRow,
  LabelIngredient,
  LabelMeal,
  mealSlotLabel,
  mealSlotMeta,
  formatLongDate,
  todayISO,
} from '../produccion.models';

/** Etiquetas de entrega (design-spec §4.7) — printable 2-column grid of patient
 *  labels: Nabani mark + name, per-meal blocks, free beverages, PA quote. */
@Component({
  selector: 'app-etiquetas',
  templateUrl: './etiquetas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton, MatIcon, TileComponent, EmptyStateComponent,
    ProduccionNavComponent, DateFieldComponent,
  ],
})
export class EtiquetasComponent implements OnInit {
  private produccionService = inject(ProduccionService);

  readonly rows = signal<DeliveryLabelRow[]>([]);
  readonly isDataLoaded = signal(false);
  readonly selectedDate = signal(todayISO());

  readonly longDate = computed(() => formatLongDate(this.selectedDate()));

  protected readonly mealSlotLabel = mealSlotLabel;
  protected readonly brandColor = 'rgb(var(--maguey-brand))';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isDataLoaded.set(false);
    this.produccionService.getDeliveryLabels(this.selectedDate()).subscribe({
      next: (response) => {
        this.rows.set(response.rows ?? []);
        this.isDataLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.rows.set([]);
        this.isDataLoaded.set(true);
      },
    });
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
    this.loadData();
  }

  print(): void {
    window.print();
  }

  patientName(row: DeliveryLabelRow): string {
    return `${row.patient?.firstName ?? ''} ${row.patient?.lastName ?? ''}`.trim() || '—';
  }

  mealCode(meal: LabelMeal): string {
    return mealSlotMeta(meal.mealSlot).code;
  }

  /** Substituted ingredients within a meal → shown as blue notes (design-spec §4.7). */
  substitutionsOf(meal: LabelMeal): LabelIngredient[] {
    return (meal.ingredients ?? []).filter(i => i.substituted);
  }
}
