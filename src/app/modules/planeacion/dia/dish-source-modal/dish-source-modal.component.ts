import { Component, OnInit, ChangeDetectionStrategy, DestroyRef, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { CompactSelectComponent, MgSelectOption } from '@shared/components/compact-select/compact-select.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

import { PlaneacionService } from '../../planeacion.service';
import {
  IDishOption,
  IMenuDish,
  IMenuMeal,
  MEAL_SLOTS,
  mealSlotMeta,
  mealTimeLabel,
  slotToMealTime,
  normalizeMealSlot,
  todayIso,
  shiftIso,
} from '../../planeacion.models';

export interface DishSourceData {
  mode: 'library' | 'copy';
  slot?: string;
  date?: string;
}

export interface DishSourceResult {
  slot: string;
  dish: IMenuDish;
}

@Component({
  selector: 'app-dish-source-modal',
  templateUrl: './dish-source-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, ModalShellComponent, CompactSelectComponent,
    PillComponent, EmptyStateComponent, MatButton, MatIcon,
  ],
})
export class DishSourceModalComponent implements OnInit {
  private planeacionService = inject(PlaneacionService);
  private dialogRef = inject<MatDialogRef<DishSourceModalComponent>>(MatDialogRef);
  private destroyRef = inject(DestroyRef);
  protected data = inject<DishSourceData>(MAT_DIALOG_DATA);

  protected readonly mealTimeLabel = mealTimeLabel;
  protected readonly mealSlotMeta = mealSlotMeta;
  protected readonly isLibrary = this.data.mode === 'library';
  protected readonly fixedSlot = this.data.slot ?? null;
  protected readonly title = this.data.mode === 'library' ? 'Desde biblioteca' : 'Copiar de otro día';

  readonly slotOptions: MgSelectOption[] = MEAL_SLOTS.map(s => ({ value: s.slot, label: s.label }));
  readonly selectedSlot = signal<string>(this.data.slot ?? MEAL_SLOTS[0].slot);

  readonly searchControl = new FormControl('');
  readonly dishes = signal<IDishOption[]>([]);
  readonly loading = signal(false);

  readonly copyDate = signal<string>(shiftIso(this.data.date ?? todayIso(), -1));
  readonly copyMeals = signal<IMenuMeal[]>([]);

  ngOnInit(): void {
    if (this.isLibrary) {
      this.loadLibrary();
      this.searchControl.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.loadLibrary());
    } else {
      this.loadCopyDay();
    }
  }

  private loadLibrary(): void {
    this.loading.set(true);
    this.planeacionService.getDishes({
      mealTime: slotToMealTime(this.selectedSlot()),
      searchText: this.searchControl.value?.trim() || null,
      limit: 20,
      offset: 0,
    }).subscribe({
      next: (response) => {
        this.dishes.set(response.rows ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.dishes.set([]);
        this.loading.set(false);
      },
    });
  }

  private loadCopyDay(): void {
    this.loading.set(true);
    this.planeacionService.getMenuDay(this.copyDate()).subscribe({
      next: (menu) => {
        this.copyMeals.set((menu?.meals ?? []).filter(m => !!m.dish));
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.copyMeals.set([]);
        this.loading.set(false);
      },
    });
  }

  onSlotChange(slot: string | number | null): void {
    this.selectedSlot.set(String(slot ?? MEAL_SLOTS[0].slot));
    if (this.isLibrary) {
      this.loadLibrary();
    }
  }

  onCopyDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.copyDate.set(value);
      this.loadCopyDay();
    }
  }

  mealLabelFor(slot: string): string {
    return mealSlotMeta(normalizeMealSlot(slot)).label;
  }

  useDishOption(dish: IDishOption): void {
    this.dialogRef.close({
      slot: this.fixedSlot ?? this.selectedSlot(),
      dish: { id: dish.id, name: dish.name, mealTime: dish.mealTime, ingredients: dish.ingredients ?? [] },
    } satisfies DishSourceResult);
  }

  useMenuMeal(meal: IMenuMeal): void {
    if (!meal.dish) return;
    this.dialogRef.close({
      slot: this.fixedSlot ?? this.selectedSlot(),
      dish: meal.dish,
    } satisfies DishSourceResult);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
