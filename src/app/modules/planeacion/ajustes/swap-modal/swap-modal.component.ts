import { Component, OnInit, ChangeDetectionStrategy, DestroyRef, computed, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

import { PlaneacionService } from '../../planeacion.service';
import { IAdjustmentIngredient, ISwapSuggestion, ConflictType } from '../../planeacion.models';

export interface SwapModalData {
  deliveryDayId: number;
  ingredient: IAdjustmentIngredient;
  mealSlotLabel: string;
  conflictType: ConflictType;
  patientName: string;
}

export type SwapModalResult = { action: 'swap' | 'eliminate' };

@Component({
  selector: 'app-swap-modal',
  templateUrl: './swap-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, ModalShellComponent, PillComponent, EmptyStateComponent,
    MatButton, MatIcon,
  ],
})
export class SwapModalComponent implements OnInit {
  private planeacionService = inject(PlaneacionService);
  private dialogRef = inject<MatDialogRef<SwapModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  private destroyRef = inject(DestroyRef);
  protected data = inject<SwapModalData>(MAT_DIALOG_DATA);

  readonly suggestions = signal<ISwapSuggestion[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly searchControl = new FormControl('');
  private readonly searchTerm = signal('');

  protected readonly isDisease = this.data.conflictType === 'disease';

  readonly subtitle = computed(() => {
    const ing = this.data.ingredient;
    const qty = ing.quantity != null ? ` ${ing.quantity} ${ing.unit ?? ''}`.trimEnd() : '';
    return `${this.data.mealSlotLabel} · ${ing.name}${qty} · ${this.data.patientName}`;
  });

  readonly bannerText = computed(() =>
    this.isDisease
      ? 'Este ingrediente no es apto por una enfermedad del paciente.'
      : 'A este paciente no le gusta este ingrediente.',
  );

  readonly groupLabel = computed(() => this.suggestions()[0]?.foodGroup ?? 'Equivalentes');

  readonly visibleSuggestions = computed<ISwapSuggestion[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const rows = this.suggestions();
    return term ? rows.filter(s => (s.name ?? '').toLowerCase().includes(term)) : rows;
  });

  ngOnInit(): void {
    this.loadSuggestions();
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.searchTerm.set(value ?? ''));
  }

  private loadSuggestions(): void {
    this.loading.set(true);
    this.planeacionService.getSwapSuggestions(this.data.deliveryDayId, this.data.ingredient.id).subscribe({
      next: (response) => {
        this.suggestions.set(response.rows ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.suggestions.set([]);
        this.loading.set(false);
      },
    });
  }

  use(suggestion: ISwapSuggestion): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.planeacionService.swapIngredient(this.data.deliveryDayId, this.data.ingredient.id, suggestion.ingredientId).pipe(
      this.toast.observe({
        loading: 'Sustituyendo ingrediente...',
        success: 'Ingrediente sustituido',
        error: 'Error al sustituir el ingrediente',
      }),
    ).subscribe({
      next: () => this.dialogRef.close({ action: 'swap' } satisfies SwapModalResult),
      error: (err) => {
        this.busy.set(false);
        console.error(err);
        return of(err);
      },
    });
  }

  eliminate(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.planeacionService.eliminateIngredient(this.data.deliveryDayId, this.data.ingredient.id).pipe(
      this.toast.observe({
        loading: 'Eliminando de la comida...',
        success: 'Ingrediente eliminado de la comida',
        error: 'Error al eliminar el ingrediente',
      }),
    ).subscribe({
      next: () => this.dialogRef.close({ action: 'eliminate' } satisfies SwapModalResult),
      error: (err) => {
        this.busy.set(false);
        console.error(err);
        return of(err);
      },
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
