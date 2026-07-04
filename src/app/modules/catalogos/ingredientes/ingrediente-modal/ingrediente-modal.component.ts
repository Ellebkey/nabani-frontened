import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CurrencyPipe } from '@angular/common';
import { catchError, of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { CompactSelectComponent, MgSelectOption } from '@shared/components/compact-select/compact-select.component';

import { CatalogosService } from '../../catalogos.service';
import { IIngredient, IDisease, FOOD_GROUPS, BASE_UNIT_OPTIONS, foodGroupMeta } from '../../catalogos.models';

interface DialogData {
  ingredient?: IIngredient;
  diseases: IDisease[];
  isEditMode?: boolean;
}

@Component({
  selector: 'app-ingrediente-modal',
  templateUrl: './ingrediente-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, ModalShellComponent, CompactSelectComponent,
    MatButton, MatProgressSpinner, CurrencyPipe,
  ],
})
export class IngredienteModalComponent implements OnInit {
  private catalogosService = inject(CatalogosService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<IngredienteModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  private data = inject<DialogData>(MAT_DIALOG_DATA);

  readonly form: FormGroup = this.fb.group({
    name: [null, Validators.required],
    foodGroup: [null, Validators.required],
    baseUnit: ['gr', Validators.required],
    baseQuantity: [null, [Validators.required, Validators.min(0)]],
    lastPrice: [null],
  });

  private readonly formEvents = toSignal(this.form.events);
  readonly formValue = computed(() => { this.formEvents(); return this.form.getRawValue(); });
  readonly formDisabled = computed(() => { this.formEvents(); return this.form.disabled; });

  readonly diseases = signal<IDisease[]>(this.data?.diseases ?? []);
  readonly selectedDiseaseIds = signal<Set<number>>(new Set());
  readonly isEditMode = signal(false);
  readonly title = computed(() => this.isEditMode() ? 'Editar ingrediente' : 'Nuevo ingrediente');

  readonly foodGroupOptions: MgSelectOption[] = FOOD_GROUPS.map(g => ({ value: g.key, label: g.label }));
  readonly baseUnitOptions: MgSelectOption[] = BASE_UNIT_OPTIONS;

  ngOnInit(): void {
    const ingredient = this.data?.ingredient;
    if (this.data?.isEditMode && ingredient) {
      this.isEditMode.set(true);
      this.form.patchValue({
        name: ingredient.name,
        foodGroup: foodGroupMeta(ingredient.foodGroup).key,
        baseUnit: ingredient.baseUnit ?? 'gr',
        baseQuantity: ingredient.baseQuantity,
        lastPrice: ingredient.lastPrice,
      });
      this.selectedDiseaseIds.set(new Set((ingredient.diseases ?? []).map(d => d.id)));
    }
  }

  isDiseaseSelected(id: number): boolean {
    return this.selectedDiseaseIds().has(id);
  }

  toggleDisease(id: number): void {
    this.selectedDiseaseIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  showError(controlName: string): boolean {
    this.formEvents();
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.form.disable();
    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name,
      foodGroup: raw.foodGroup,
      baseUnit: raw.baseUnit,
      baseQuantity: Number(raw.baseQuantity),
      lastPrice: raw.lastPrice != null && raw.lastPrice !== '' ? Number(raw.lastPrice) : null,
      diseaseIds: Array.from(this.selectedDiseaseIds()),
    };

    const save$ = this.isEditMode()
      ? this.catalogosService.updateIngredient(this.data.ingredient!.id, payload)
      : this.catalogosService.saveIngredient(payload);

    const messages = this.isEditMode()
      ? { loading: 'Actualizando...', success: 'Ingrediente actualizado exitosamente', error: 'Error al actualizar el ingrediente' }
      : { loading: 'Guardando...', success: 'Ingrediente creado exitosamente', error: 'Error al guardar el ingrediente' };

    save$.pipe(
      this.toast.observe(messages),
      catchError((err) => {
        this.form.enable();
        console.error(err);
        return of(null);
      }),
    ).subscribe({
      next: (response) => {
        if (response) {
          setTimeout(() => this.dialogRef.close(response), 400);
        }
      },
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
