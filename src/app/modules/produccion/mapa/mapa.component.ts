import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

import { ProduccionService } from '../produccion.service';
import { ProduccionNavComponent } from '../components/produccion-nav.component';
import { DateFieldComponent } from '../components/date-field.component';
import { NbMapTableComponent } from './nb-map-table.component';
import {
  ProductionMap,
  buildMapColumns,
  buildHeaderDishes,
  formatLongDate,
  todayISO,
} from '../produccion.models';

/** Mapa de producción (design-spec §4.6) ★ — the dense per-patient portion grid,
 *  the app's single hardest screen and a print output. */
@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe, MatButton, MatIcon, EmptyStateComponent,
    ProduccionNavComponent, DateFieldComponent, NbMapTableComponent,
  ],
})
export class MapaComponent implements OnInit {
  private produccionService = inject(ProduccionService);

  readonly map = signal<ProductionMap | null>(null);
  readonly isDataLoaded = signal(false);
  readonly selectedDate = signal(todayISO());

  readonly headerDishes = computed(() => buildHeaderDishes(this.map()?.mealGroups));
  readonly columns = computed(() => buildMapColumns(this.map()?.mealGroups));
  readonly rows = computed(() => this.map()?.rows ?? []);
  readonly totals = computed(() => this.map()?.totalsForKitchen ?? []);
  readonly patientCount = computed(() => this.map()?.patientCount ?? 0);
  readonly longDate = computed(() => formatLongDate(this.selectedDate()));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isDataLoaded.set(false);
    this.produccionService.getProductionMap(this.selectedDate()).subscribe({
      next: (response) => {
        this.map.set(response);
        this.isDataLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.map.set(null);
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
}
