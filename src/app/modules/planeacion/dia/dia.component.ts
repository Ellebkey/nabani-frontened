import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { DecimalPipe } from '@angular/common';
import { forkJoin, of, Observable } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { HotToastService } from '@ngxpert/hot-toast';

import { TileComponent } from '@shared/components/tile/tile.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

import { PlaneacionService } from '../planeacion.service';
import { PlaneacionNavComponent } from '../components/planeacion-nav.component';
import { DishSourceModalComponent, DishSourceData, DishSourceResult } from './dish-source-modal/dish-source-modal.component';
import {
  ICalorieLevel,
  IMenuDay,
  IMenuDish,
  IMenuIngredient,
  IIngredientOption,
  DishDTO,
  MEAL_SLOTS,
  normalizeMealSlot,
  slotToMealTime,
  formatLongDate,
  todayIso,
} from '../planeacion.models';

interface EditIngredient {
  key: number;
  ingredientId: number | null;
  name: string;
  baseUnit: string;
  baseQuantity: number | null;
  unit: string;
  position: number;
  portions: Record<number, number | null>;
}

interface EditMeal {
  slot: string;
  label: string;
  code: string;
  dishId: number | null;
  dishName: string;
  mealTime: string;
  hasDish: boolean;
  ingredients: EditIngredient[];
  addSearch: string;
}

@Component({
  selector: 'app-dia',
  templateUrl: './dia.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, MatButton, MatIcon, MatMenuTrigger, MatMenu, MatMenuItem, DecimalPipe,
    TileComponent, EmptyStateComponent, PlaneacionNavComponent,
  ],
})
export class DiaComponent {
  private planeacionService = inject(PlaneacionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private toast = inject(HotToastService);

  protected readonly formatLongDate = formatLongDate;

  readonly date = toSignal(
    this.route.queryParamMap.pipe(map(q => q.get('date') || todayIso())),
    { initialValue: todayIso() },
  );

  readonly menuDayId = signal<number | null>(null);
  readonly levels = signal<ICalorieLevel[]>([]);
  readonly visibleLevelIds = signal<number[]>([]);
  readonly meals = signal<EditMeal[]>([]);
  readonly allIngredients = signal<IIngredientOption[]>([]);
  readonly isDataLoaded = signal(false);
  readonly saving = signal(false);
  readonly applying = signal(false);
  readonly menuMeal = signal<EditMeal | null>(null);

  private keyCounter = 0;

  readonly visibleLevels = computed<ICalorieLevel[]>(() => {
    const ids = new Set(this.visibleLevelIds());
    return this.levels().filter(l => ids.has(l.id));
  });

  readonly addableLevels = computed<ICalorieLevel[]>(() => {
    const ids = new Set(this.visibleLevelIds());
    return this.levels().filter(l => !ids.has(l.id));
  });

  constructor() {
    this.planeacionService.getIngredients({ limit: 500, offset: 0 }).subscribe({
      next: (response) => this.allIngredients.set(response.rows ?? []),
      error: (err) => console.error(err),
    });

    let lastDate = '';
    this.route.queryParamMap
      .pipe(map(q => q.get('date') || todayIso()), takeUntilDestroyed())
      .subscribe(date => {
        if (date !== lastDate) {
          lastDate = date;
          this.loadDay(date);
        }
      });
  }

  private loadDay(date: string): void {
    this.isDataLoaded.set(false);
    forkJoin({
      levels: this.planeacionService.getCalorieLevels(),
      menu: this.planeacionService.getMenuDay(date).pipe(catchError(() => of(null as IMenuDay | null))),
    }).subscribe({
      next: ({ levels, menu }) => {
        const sortedLevels = [...(levels.rows ?? [])].sort((a, b) => a.kcal - b.kcal);
        this.levels.set(sortedLevels);
        this.menuDayId.set(menu?.id ?? null);
        this.initVisibleLevels(menu, sortedLevels);
        this.meals.set(this.buildMeals(menu));
        this.isDataLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.levels.set([]);
        this.meals.set(this.buildMeals(null));
        this.isDataLoaded.set(true);
      },
    });
  }

  private initVisibleLevels(menu: IMenuDay | null, levels: ICalorieLevel[]): void {
    const present = new Set<number>();
    for (const meal of menu?.meals ?? []) {
      for (const ing of meal.dish?.ingredients ?? []) {
        for (const p of ing.portions ?? []) {
          present.add(p.calorieLevelId);
        }
      }
    }
    const ordered = levels.filter(l => present.has(l.id)).map(l => l.id);
    this.visibleLevelIds.set(ordered.length ? ordered : levels.map(l => l.id));
  }

  private buildMeals(menu: IMenuDay | null): EditMeal[] {
    return MEAL_SLOTS.map(slotMeta => {
      const found = (menu?.meals ?? []).find(m => normalizeMealSlot(m.mealSlot) === slotMeta.slot);
      const dish = found?.dish ?? null;
      return {
        slot: slotMeta.slot,
        label: slotMeta.label,
        code: slotMeta.code,
        dishId: found?.dishId ?? dish?.id ?? null,
        dishName: dish?.name ?? '',
        mealTime: dish?.mealTime ?? slotToMealTime(slotMeta.slot),
        hasDish: !!dish,
        ingredients: this.editIngredients(dish?.ingredients ?? []),
        addSearch: '',
      };
    });
  }

  private editIngredients(ingredients: IMenuIngredient[]): EditIngredient[] {
    return ingredients.map(ing => {
      const portions: Record<number, number | null> = {};
      for (const p of ing.portions ?? []) {
        portions[p.calorieLevelId] = p.portions;
      }
      return {
        key: this.keyCounter++,
        ingredientId: ing.ingredientId,
        name: ing.ingredient?.name ?? '',
        baseUnit: ing.ingredient?.baseUnit ?? ing.unit ?? 'gr',
        baseQuantity: ing.baseQuantity,
        unit: ing.unit ?? ing.ingredient?.baseUnit ?? 'gr',
        position: ing.position ?? 0,
        portions,
      };
    });
  }

  // ---- Level columns ------------------------------------------------------
  addLevel(levelId: number): void {
    this.visibleLevelIds.update(ids => ids.includes(levelId) ? ids : [...ids, levelId]);
  }

  // ---- Ingredient rows ----------------------------------------------------
  addResults(meal: EditMeal): IIngredientOption[] {
    const term = meal.addSearch.trim().toLowerCase();
    if (!term) return [];
    const used = new Set(meal.ingredients.map(i => i.ingredientId).filter((id): id is number => id != null));
    return this.allIngredients()
      .filter(opt => !used.has(opt.id) && (opt.name ?? '').toLowerCase().includes(term))
      .slice(0, 8);
  }

  onAddSearch(meal: EditMeal, event: Event): void {
    meal.addSearch = (event.target as HTMLInputElement).value;
    this.meals.update(list => [...list]);
  }

  addIngredient(meal: EditMeal, option: IIngredientOption): void {
    meal.ingredients.push({
      key: this.keyCounter++,
      ingredientId: option.id,
      name: option.name,
      baseUnit: option.baseUnit ?? 'gr',
      baseQuantity: option.baseQuantity ?? null,
      unit: option.baseUnit ?? 'gr',
      position: meal.ingredients.length,
      portions: {},
    });
    meal.addSearch = '';
    this.meals.update(list => [...list]);
  }

  removeIngredient(meal: EditMeal, ingredient: EditIngredient): void {
    meal.ingredients = meal.ingredients.filter(i => i.key !== ingredient.key);
    this.meals.update(list => [...list]);
  }

  // ---- Dish sourcing ------------------------------------------------------
  newDish(meal: EditMeal): void {
    meal.hasDish = true;
    meal.dishId = null;
    meal.dishName = '';
    meal.mealTime = slotToMealTime(meal.slot);
    meal.ingredients = [];
    this.meals.update(list => [...list]);
  }

  clearDish(meal: EditMeal | null): void {
    if (!meal) return;
    meal.hasDish = false;
    meal.dishId = null;
    meal.dishName = '';
    meal.ingredients = [];
    meal.addSearch = '';
    this.meals.update(list => [...list]);
  }

  openLibrary(slot?: string): void {
    this.openSource({ mode: 'library', slot, date: this.date() });
  }

  openCopy(slot?: string): void {
    this.openSource({ mode: 'copy', slot, date: this.date() });
  }

  private openSource(data: DishSourceData): void {
    const dialogRef = this.dialog.open(DishSourceModalComponent, {
      width: '560px',
      maxWidth: '100vw',
      disableClose: true,
      data,
    });
    dialogRef.afterClosed().subscribe((result: DishSourceResult | undefined) => {
      if (result) {
        this.assignDish(result.slot, result.dish);
      }
    });
  }

  private assignDish(slot: string, dish: IMenuDish): void {
    const targetSlot = normalizeMealSlot(slot);
    const meal = this.meals().find(m => m.slot === targetSlot);
    if (!meal) return;
    meal.hasDish = true;
    meal.dishId = dish.id ?? null;
    meal.dishName = dish.name ?? '';
    meal.mealTime = dish.mealTime ?? slotToMealTime(meal.slot);
    meal.ingredients = this.editIngredients(dish.ingredients ?? []);
    meal.addSearch = '';
    const dishLevels = new Set(this.visibleLevelIds());
    for (const ing of dish.ingredients ?? []) {
      for (const p of ing.portions ?? []) {
        dishLevels.add(p.calorieLevelId);
      }
    }
    const levelIds = this.levels().filter(l => dishLevels.has(l.id)).map(l => l.id);
    if (levelIds.length) {
      this.visibleLevelIds.set(levelIds);
    }
    this.meals.update(list => [...list]);
  }

  // ---- Persistence --------------------------------------------------------
  private buildDishDTO(meal: EditMeal): DishDTO {
    const levelIds = this.visibleLevelIds();
    return {
      name: meal.dishName?.trim() || 'Sin nombre',
      mealTime: meal.mealTime || slotToMealTime(meal.slot),
      ingredients: meal.ingredients
        .filter(ing => ing.ingredientId != null)
        .map((ing, index) => ({
          ingredientId: ing.ingredientId as number,
          baseQuantity: Number(ing.baseQuantity) || 0,
          unit: ing.unit || ing.baseUnit || 'gr',
          position: index,
          portions: levelIds
            .filter(id => ing.portions[id] != null)
            .map(id => ({ calorieLevelId: id, portions: Number(ing.portions[id]) || 0 })),
        })),
    };
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);

    const slotResults = this.meals().map(meal => {
      if (!meal.hasDish) {
        return of({ slot: meal.slot, dishId: null as number | null });
      }
      const dto = this.buildDishDTO(meal);
      const request$: Observable<IMenuDish> = meal.dishId != null
        ? this.planeacionService.saveDish(meal.dishId, dto)
        : this.planeacionService.createDish(dto);
      return request$.pipe(map(dish => ({ slot: meal.slot, dishId: dish?.id ?? meal.dishId })));
    });

    forkJoin(slotResults).pipe(
      switchMap(results => {
        const id = this.menuDayId();
        if (id == null) {
          return of(results);
        }
        const assignDto = {
          meals: results.map((r, index) => ({ mealSlot: r.slot, dishId: r.dishId, position: index })),
        };
        return this.planeacionService.assignMenuDay(id, assignDto).pipe(map(() => results));
      }),
      this.toast.observe({
        loading: 'Guardando menú...',
        success: 'Menú guardado exitosamente',
        error: 'Error al guardar el menú',
      }),
      catchError((err) => {
        console.error(err);
        this.saving.set(false);
        return of(null);
      }),
    ).subscribe({
      next: (results) => {
        this.saving.set(false);
        if (results) {
          for (const r of results) {
            const meal = this.meals().find(m => m.slot === r.slot);
            if (meal) meal.dishId = r.dishId;
          }
          this.meals.update(list => [...list]);
        }
      },
    });
  }

  applyToPatients(): void {
    if (this.applying()) return;
    this.applying.set(true);
    const date = this.date();
    this.planeacionService.applyMenuToPatients(date).pipe(
      this.toast.observe({
        loading: 'Aplicando menú a pacientes...',
        success: 'Menú aplicado a pacientes',
        error: 'Error al aplicar el menú',
      }),
    ).subscribe({
      next: () => {
        this.applying.set(false);
        this.router.navigate(['/planeacion/ajustes'], { queryParams: { date } });
      },
      error: (err) => {
        this.applying.set(false);
        console.error(err);
      },
    });
  }

  onDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { date: value },
        queryParamsHandling: 'merge',
      });
    }
  }
}
