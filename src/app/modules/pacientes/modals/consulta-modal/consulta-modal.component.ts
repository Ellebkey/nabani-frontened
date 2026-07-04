import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';
import { format, parseISO } from 'date-fns';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { CompactSelectComponent, MgSelectOption } from '@shared/components/compact-select/compact-select.component';

import { PacientesService } from '../../pacientes.service';
import { ICalorieLevel, IConsultation, MEDICIONES, ConsultationDTO } from '../../pacientes.models';

interface DialogData {
  patientId: number;
  patientName: string;
  defaultKcalId?: number | null;
}

@Component({
  selector: 'app-consulta-modal',
  templateUrl: './consulta-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, ModalShellComponent, CompactSelectComponent,
    MatButton, MatProgressSpinner,
  ],
})
export class ConsultaModalComponent implements OnInit {
  private pacientesService = inject(PacientesService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<ConsultaModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);

  protected readonly mediciones = MEDICIONES;
  readonly calorieLevels = signal<ICalorieLevel[]>([]);
  readonly lastConsultation = signal<IConsultation | null>(null);

  readonly form: FormGroup = this.fb.group({
    consultDate: [format(new Date(), 'yyyy-MM-dd'), Validators.required],
    price: [null],
    weight: [null],
    bodyFat: [null],
    muscle: [null],
    water: [null],
    arm: [null],
    waist: [null],
    abdomen: [null],
    hip: [null],
    objetivoKcal: [this.data.defaultKcalId ?? null],
    notes: [null],
  });

  private readonly formEvents = toSignal(this.form.events);
  readonly formDisabled = computed(() => { this.formEvents(); return this.form.disabled; });

  readonly subtitle = computed(() => `${this.data.patientName} · seguimiento`);

  readonly kcalOptions = computed<MgSelectOption[]>(() =>
    this.calorieLevels().map(level => ({ value: level.id, label: `${level.kcal} kcal` }))
  );

  readonly lastDateLabel = computed(() => {
    const last = this.lastConsultation();
    if (!last?.consultDate) return '';
    try {
      return `última: ${format(parseISO(last.consultDate), 'dd MMM yyyy')}`;
    } catch {
      return '';
    }
  });

  ngOnInit(): void {
    this.pacientesService.getCalorieLevels().subscribe({
      next: (response) => this.calorieLevels.set(response.rows ?? []),
      error: () => { /* keep current state on load failure */ },
    });
    this.pacientesService.getConsultations(this.data.patientId).subscribe({
      next: (response) => {
        const sorted = [...(response.rows ?? [])].sort(
          (a, b) => this.time(b.consultDate) - this.time(a.consultDate)
        );
        this.lastConsultation.set(sorted[0] ?? null);
      },
      error: () => { /* keep current state on load failure */ },
    });
  }

  placeholder(key: keyof IConsultation, unit: string): string {
    const last = this.lastConsultation();
    const value = last?.[key];
    return value != null && value !== '' ? `${value}` : unit;
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

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.form.disable();
    const raw = this.form.getRawValue();
    const payload: ConsultationDTO = {
      consultDate: raw.consultDate,
      type: 'seguimiento',
      price: this.toNumber(raw.price),
      weight: this.toNumber(raw.weight),
      bodyFat: this.toNumber(raw.bodyFat),
      muscle: this.toNumber(raw.muscle),
      water: this.toNumber(raw.water),
      arm: this.toNumber(raw.arm),
      waist: this.toNumber(raw.waist),
      abdomen: this.toNumber(raw.abdomen),
      hip: this.toNumber(raw.hip),
      objetivoKcal: this.toNumber(raw.objetivoKcal),
      notes: raw.notes || null,
    };

    this.pacientesService.saveConsultation(this.data.patientId, payload).pipe(
      this.toast.observe({
        loading: 'Guardando consulta...',
        success: 'Consulta guardada exitosamente',
        error: 'Error al guardar la consulta',
      }),
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

  private time(dateStr: string | null | undefined): number {
    if (!dateStr) return 0;
    try {
      return parseISO(dateStr).getTime();
    } catch {
      return 0;
    }
  }
}
