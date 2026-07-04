import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { TileComponent } from '@shared/components/tile/tile.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

import { ProduccionService } from '../produccion.service';
import { ProduccionNavComponent } from '../components/produccion-nav.component';
import { DateFieldComponent } from '../components/date-field.component';
import {
  KitchenView,
  KitchenException,
  buildKitchenCards,
  formatLongDate,
  todayISO,
} from '../produccion.models';

/** Vista cocina (design-spec §4.8) — read-only, large-type tablet view. One card
 *  per dish: ingredient totals + exceptions (substitutions blue, eliminations rose). */
@Component({
  selector: 'app-cocina',
  templateUrl: './cocina.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe, MatButton, MatIcon, RouterLink, TileComponent, EmptyStateComponent,
    ProduccionNavComponent, DateFieldComponent,
  ],
})
export class CocinaComponent implements OnInit {
  private produccionService = inject(ProduccionService);

  readonly view = signal<KitchenView | null>(null);
  readonly isDataLoaded = signal(false);
  readonly selectedDate = signal(todayISO());

  readonly cards = computed(() => buildKitchenCards(this.view()?.slots));
  readonly longDate = computed(() => formatLongDate(this.selectedDate()));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isDataLoaded.set(false);
    this.produccionService.getKitchenView(this.selectedDate()).subscribe({
      next: (response) => {
        this.view.set(response);
        this.isDataLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.view.set(null);
        this.isDataLoaded.set(true);
      },
    });
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
    this.loadData();
  }

  isSubstitution(exception: KitchenException): boolean {
    return exception.type === 'substitution';
  }
}
