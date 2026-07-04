import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { CompactSelectComponent, MgSelectOption } from '@shared/components/compact-select/compact-select.component';

import { PacientesService } from '../../pacientes.service';
import {
  IPatient, IDisease, ICalorieLevel, IIngredientOption, PatientDTO,
  RATIONS, EVALUATION_FIELDS, WEEK_OPTIONS, GENDER_OPTIONS,
} from '../../pacientes.models';

interface DialogData {
  patientId?: number;
  isEditMode?: boolean;
}

@Component({
  selector: 'app-paciente-modal',
  templateUrl: './paciente-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, ModalShellComponent, CompactSelectComponent,
    MatButton, MatIcon, MatProgressSpinner,
  ],
})
export class PacienteModalComponent implements OnInit {
  private pacientesService = inject(PacientesService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<PacienteModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  private data = inject<DialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly rations = RATIONS;
  protected readonly evaluationFields = EVALUATION_FIELDS;
  readonly weekOptions: MgSelectOption[] = WEEK_OPTIONS;
  readonly genderOptions: MgSelectOption[] = GENDER_OPTIONS;

  readonly diseases = signal<IDisease[]>([]);
  readonly calorieLevels = signal<ICalorieLevel[]>([]);
  readonly ingredients = signal<IIngredientOption[]>([]);
  readonly selectedDiseaseIds = signal<Set<number>>(new Set());
  readonly selectedPreferenceIds = signal<Set<number>>(new Set());
  readonly preferencePicker = signal<number | null>(null);

  readonly isEditMode = signal(false);
  readonly title = computed(() => this.isEditMode() ? 'Editar paciente' : 'Nuevo paciente');

  readonly form: FormGroup = this.fb.group({
    firstName: [null, Validators.required],
    lastName: [null, Validators.required],
    email: [null, Validators.email],
    cellphone: [null],
    birthday: [null],
    gender: [null],
    week: ['LV'],
    zone: [null],
    tuppers: [false],
    otherDiseases: [null],
    otherPreferences: [null],
    calorieLevelId: [null, Validators.required],
    address: this.fb.group({
      street: [null, Validators.required],
      zipCode: [null],
      neighborhood: [null],
      city: [null],
      state: [null],
    }),
    evaluation: this.fb.group({
      weight: [null], height: [null], age: [null], bodyFat: [null],
      arm: [null], highWaist: [null], abdomen: [null], hip: [null],
    }),
    nutritionPlan: this.fb.group({
      verduras: [null], frutas: [null], cereales: [null], lacteos: [null],
      pDesayuno: [null], pComida: [null], pCena: [null], aceites: [null], semillas: [null],
    }),
  });

  private readonly formEvents = toSignal(this.form.events);
  readonly formDisabled = computed(() => { this.formEvents(); return this.form.disabled; });

  readonly calorieOptions = computed<MgSelectOption[]>(() =>
    this.calorieLevels().map(level => ({ value: level.id, label: `${level.kcal} kcal` }))
  );

  readonly availableIngredientOptions = computed<MgSelectOption[]>(() => {
    const selected = this.selectedPreferenceIds();
    return this.ingredients()
      .filter(i => !selected.has(i.id))
      .map(i => ({ value: i.id, label: i.name }));
  });

  readonly selectedPreferences = computed<IIngredientOption[]>(() => {
    const selected = this.selectedPreferenceIds();
    return this.ingredients().filter(i => selected.has(i.id));
  });

  ngOnInit(): void {
    this.pacientesService.getDiseases().subscribe({
      next: (r) => this.diseases.set(r.rows ?? []),
      error: () => {},
    });
    this.pacientesService.getCalorieLevels().subscribe({
      next: (r) => this.calorieLevels.set(r.rows ?? []),
      error: () => {},
    });
    this.pacientesService.getIngredients({ limit: 500 }).subscribe({
      next: (r) => this.ingredients.set(r.rows ?? []),
      error: () => {},
    });

    if (this.data?.isEditMode && this.data.patientId) {
      this.isEditMode.set(true);
      this.pacientesService.getPatient(this.data.patientId).subscribe({
        next: (patient) => this.patchFromPatient(patient),
        error: (err) => console.error(err),
      });
    }
  }

  private patchFromPatient(patient: IPatient): void {
    this.form.patchValue({
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      cellphone: patient.cellphone,
      birthday: patient.birthday ? patient.birthday.substring(0, 10) : null,
      gender: patient.gender,
      week: patient.week ?? 'LV',
      zone: patient.zone,
      tuppers: !!patient.tuppers,
      otherDiseases: patient.otherDiseases,
      otherPreferences: patient.otherPreferences,
      calorieLevelId: patient.calorieLevel?.id ?? patient.nutritionPlan?.calorieLevelId ?? null,
      address: {
        street: patient.address?.street ?? null,
        zipCode: patient.address?.zipCode ?? null,
        neighborhood: patient.address?.neighborhood ?? null,
        city: patient.address?.city ?? null,
        state: patient.address?.state ?? null,
      },
      nutritionPlan: {
        verduras: patient.nutritionPlan?.verduras ?? null,
        frutas: patient.nutritionPlan?.frutas ?? null,
        cereales: patient.nutritionPlan?.cereales ?? null,
        lacteos: patient.nutritionPlan?.lacteos ?? null,
        pDesayuno: patient.nutritionPlan?.pDesayuno ?? null,
        pComida: patient.nutritionPlan?.pComida ?? null,
        pCena: patient.nutritionPlan?.pCena ?? null,
        aceites: patient.nutritionPlan?.aceites ?? null,
        semillas: patient.nutritionPlan?.semillas ?? null,
      },
    });
    this.selectedDiseaseIds.set(new Set((patient.diseases ?? []).map(d => d.id)));
    this.selectedPreferenceIds.set(new Set((patient.preferences ?? []).map(p => p.id)));
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

  addPreference(id: number | null): void {
    if (id == null) return;
    this.selectedPreferenceIds.update(set => new Set(set).add(id));
    this.preferencePicker.set(null);
  }

  removePreference(id: number): void {
    this.selectedPreferenceIds.update(set => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
  }

  showError(controlName: string): boolean {
    this.formEvents();
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return isNaN(n) ? null : n;
  }

  private mapNumbers(group: Record<string, unknown>): Record<string, number | null> {
    const out: Record<string, number | null> = {};
    for (const key of Object.keys(group)) {
      out[key] = this.toNumber(group[key]);
    }
    return out;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.form.disable();
    const raw = this.form.getRawValue();

    const payload: PatientDTO = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email || null,
      cellphone: raw.cellphone || null,
      gender: raw.gender || null,
      birthday: raw.birthday || null,
      week: raw.week || null,
      zone: raw.zone || null,
      tuppers: !!raw.tuppers,
      otherDiseases: raw.otherDiseases || null,
      otherPreferences: raw.otherPreferences || null,
      otherFood: raw.otherPreferences || null,
      calorieLevelId: this.toNumber(raw.calorieLevelId),
      address: {
        street: raw.address.street || null,
        zipCode: raw.address.zipCode || null,
        neighborhood: raw.address.neighborhood || null,
        city: raw.address.city || null,
        state: raw.address.state || null,
      },
      nutritionPlan: {
        calorieLevelId: this.toNumber(raw.calorieLevelId),
        verduras: this.toNumber(raw.nutritionPlan.verduras),
        frutas: this.toNumber(raw.nutritionPlan.frutas),
        cereales: this.toNumber(raw.nutritionPlan.cereales),
        lacteos: this.toNumber(raw.nutritionPlan.lacteos),
        pDesayuno: this.toNumber(raw.nutritionPlan.pDesayuno),
        pComida: this.toNumber(raw.nutritionPlan.pComida),
        pCena: this.toNumber(raw.nutritionPlan.pCena),
        aceites: this.toNumber(raw.nutritionPlan.aceites),
        semillas: this.toNumber(raw.nutritionPlan.semillas),
      },
      diseaseIds: Array.from(this.selectedDiseaseIds()),
      preferenceIngredientIds: Array.from(this.selectedPreferenceIds()),
      evaluation: this.mapNumbers(raw.evaluation),
    };

    const save$ = this.isEditMode() && this.data?.patientId
      ? this.pacientesService.updatePatient(this.data.patientId, payload)
      : this.pacientesService.savePatient(payload);

    const messages = this.isEditMode()
      ? { loading: 'Actualizando...', success: 'Paciente actualizado exitosamente', error: 'Error al actualizar el paciente' }
      : { loading: 'Guardando...', success: 'Paciente creado exitosamente', error: 'Error al guardar el paciente' };

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
