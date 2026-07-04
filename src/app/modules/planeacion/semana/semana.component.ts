import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { PillComponent } from '@shared/components/pill/pill.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

import { PlaneacionService } from '../planeacion.service';
import { PlaneacionNavComponent } from '../components/planeacion-nav.component';
import {
  IWeekDay,
  IWeekMealName,
  MEAL_SLOTS,
  MealSlotMeta,
  normalizeMealSlot,
  weekStatusMeta,
  todayIso,
  shiftIso,
  formatDayCard,
  weekRangeLabel,
} from '../planeacion.models';

@Component({
  selector: 'app-semana',
  templateUrl: './semana.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton, MatIcon, DecimalPipe,
    PillComponent, EmptyStateComponent, PlaneacionNavComponent,
  ],
})
export class SemanaComponent implements OnInit {
  private planeacionService = inject(PlaneacionService);
  private router = inject(Router);
  private toast = inject(HotToastService);

  protected readonly mealSlots = MEAL_SLOTS;
  protected readonly weekStatusMeta = weekStatusMeta;
  protected readonly formatDayCard = formatDayCard;
  protected readonly today = todayIso();

  readonly weekDate = signal<string>(todayIso());
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');
  readonly days = signal<IWeekDay[]>([]);
  readonly mealsByDate = signal<Record<string, IWeekMealName[]>>({});
  readonly isDataLoaded = signal(false);
  readonly copying = signal(false);

  readonly rangeLabel = computed(() => {
    const start = this.startDate();
    const end = this.endDate();
    return start && end ? weekRangeLabel(start, end) : '';
  });

  readonly completeSummary = computed(() => {
    const rows = this.days();
    const complete = rows.filter(d => d.status === 'completo').length;
    return { complete, total: rows.length };
  });

  ngOnInit(): void {
    this.loadWeek();
  }

  loadWeek(): void {
    this.isDataLoaded.set(false);
    this.planeacionService.getWeek(this.weekDate()).subscribe({
      next: (response) => {
        this.startDate.set(response.startDate);
        this.endDate.set(response.endDate);
        this.days.set(response.days ?? []);
        this.isDataLoaded.set(true);
        this.loadMealNames(response.startDate, response.endDate);
      },
      error: (err) => {
        console.error(err);
        this.days.set([]);
        this.isDataLoaded.set(true);
      },
    });
  }

  private loadMealNames(start: string, end: string): void {
    if (!start || !end) return;
    this.planeacionService.getMenuDays(start, end).subscribe({
      next: (response) => {
        const map: Record<string, IWeekMealName[]> = {};
        for (const summary of response.rows ?? []) {
          map[summary.menuDate] = (summary.meals ?? []).map(m => ({
            mealSlot: normalizeMealSlot(m.mealSlot),
            dishName: m.dishName ?? m.dish?.name ?? null,
          }));
        }
        this.mealsByDate.set(map);
      },
      error: (err) => console.error(err),
    });
  }

  dishNameFor(date: string, slot: MealSlotMeta): string | null {
    const meals = this.mealsByDate()[date] ?? [];
    return meals.find(m => m.mealSlot === slot.slot)?.dishName ?? null;
  }

  isToday(date: string): boolean {
    return date === this.today;
  }

  prevWeek(): void {
    this.weekDate.update(d => shiftIso(d, -7));
    this.loadWeek();
  }

  nextWeek(): void {
    this.weekDate.update(d => shiftIso(d, 7));
    this.loadWeek();
  }

  openDay(day: IWeekDay): void {
    this.router.navigate(['/planeacion/dia'], { queryParams: { date: day.date } });
  }

  openToday(): void {
    this.router.navigate(['/planeacion/dia'], { queryParams: { date: this.today } });
  }

  copyPreviousWeek(): void {
    if (this.copying()) return;
    this.copying.set(true);
    this.planeacionService.copyPreviousWeek(this.weekDate()).pipe(
      this.toast.observe({
        loading: 'Copiando semana anterior...',
        success: 'Semana copiada exitosamente',
        error: 'No se pudo copiar la semana anterior',
      }),
    ).subscribe({
      next: () => {
        this.copying.set(false);
        this.loadWeek();
      },
      error: (err) => {
        this.copying.set(false);
        console.error(err);
        return of(err);
      },
    });
  }
}
