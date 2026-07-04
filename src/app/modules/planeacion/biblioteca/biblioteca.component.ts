import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { PaginationService } from '@shared/services/pagination.service';
import { PaginationSetting } from '@shared/interfaces/shared.model';
import { PageEvent, PagerComponent } from '@shared/components/pager/pager.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';

import { PlaneacionService } from '../planeacion.service';
import { PlaneacionNavComponent } from '../components/planeacion-nav.component';
import {
  IDishOption,
  ICalorieLevel,
  MEAL_TIME_OPTIONS,
  mealTimeLabel,
  todayIso,
} from '../planeacion.models';

@Component({
  selector: 'app-biblioteca',
  templateUrl: './biblioteca.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, MatButton, MatIcon, DecimalPipe,
    PagerComponent, EmptyStateComponent, PillComponent,
    ChipComponent, ChipRowComponent, PlaneacionNavComponent,
  ],
})
export class BibliotecaComponent implements OnInit, OnDestroy {
  private planeacionService = inject(PlaneacionService);
  private paginationService = inject(PaginationService);
  private router = inject(Router);

  private readonly destroy$ = new Subject<void>();

  protected readonly mealTimeLabel = mealTimeLabel;
  protected readonly skeletonCards = [1, 2, 3, 4, 5, 6];

  readonly dishes = signal<IDishOption[]>([]);
  readonly levels = signal<ICalorieLevel[]>([]);
  readonly isDataLoaded = signal(false);
  readonly pagination = signal<PaginationSetting>(this.paginationService.getDefaultPagination(true));
  readonly mealFilter = signal<string | null>(null);
  readonly totalCount = signal(0);

  readonly searchControl = new FormControl('');

  readonly filters: { value: string | null; label: string }[] = [
    { value: null, label: 'Todos' },
    ...MEAL_TIME_OPTIONS.map(o => ({ value: o.value, label: o.label })),
  ];

  ngOnInit(): void {
    this.loadLevels();
    this.loadTotal();
    this.loadData();
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(value => {
        this.pagination.update(p => ({ ...p, searchText: value?.trim() || null, offset: 0 }));
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLevels(): void {
    this.planeacionService.getCalorieLevels().subscribe({
      next: (response) => {
        const rows = [...(response.rows ?? [])].sort((a, b) => a.kcal - b.kcal);
        this.levels.set(rows);
      },
      error: (err) => console.error(err),
    });
  }

  private loadTotal(): void {
    this.planeacionService.getDishes({ limit: 1, offset: 0 }).subscribe({
      next: (response) => this.totalCount.set(response.count ?? 0),
      error: () => { /* keep current state on load failure */ },
    });
  }

  loadData(): void {
    this.isDataLoaded.set(false);
    const pagination = this.pagination();
    this.planeacionService.getDishes({
      limit: pagination.limit,
      offset: pagination.offset,
      searchText: pagination.searchText,
      mealTime: this.mealFilter(),
    }).subscribe({
      next: (response) => {
        this.dishes.set(response.rows ?? []);
        this.pagination.update(p => ({ ...p, count: response.count ?? 0 }));
        this.isDataLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.isDataLoaded.set(true);
      },
    });
  }

  setMealFilter(value: string | null): void {
    if (this.mealFilter() === value) return;
    this.mealFilter.set(value);
    this.pagination.update(p => ({ ...p, offset: 0 }));
    this.loadData();
  }

  onPageChange(event: PageEvent): void {
    this.pagination.update(p => ({ ...p, limit: event.limit, offset: event.offset }));
    this.loadData();
  }

  chipCount(value: string | null): number | null {
    return value === null ? this.totalCount() : null;
  }

  ingredientCount(dish: IDishOption): number {
    return dish.ingredients?.length ?? 0;
  }

  ingredientLine(dish: IDishOption): string {
    const parts = (dish.ingredients ?? []).slice(0, 4).map(ing => {
      const qty = ing.baseQuantity != null ? ` ${ing.baseQuantity} ${ing.unit ?? ''}`.trimEnd() : '';
      return `${ing.ingredient?.name ?? ''}${qty}`.trim();
    }).filter(Boolean);
    return parts.join(' · ');
  }

  levelComplete(dish: IDishOption, levelId: number): boolean {
    const ingredients = dish.ingredients ?? [];
    if (!ingredients.length) return false;
    return ingredients.every(ing =>
      (ing.portions ?? []).some(p => p.calorieLevelId === levelId && p.portions != null),
    );
  }

  useInMenu(_dish: IDishOption): void {
    this.router.navigate(['/planeacion/dia'], { queryParams: { date: todayIso() } });
  }

  newDish(): void {
    this.router.navigate(['/planeacion/dia'], { queryParams: { date: todayIso() } });
  }
}
