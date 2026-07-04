import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';

import { PacienteModalComponent } from '../../modals/paciente-modal/paciente-modal.component';
import { IPatient, INutritionPlan, RATIONS, weekLabel } from '../../pacientes.models';

@Component({
  selector: 'app-resumen-tab',
  templateUrl: './resumen-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
})
export class ResumenTabComponent {
  private dialog = inject(MatDialog);

  readonly patient = input.required<IPatient>();
  readonly changed = output<void>();

  protected readonly rations = RATIONS;
  protected readonly weekLabel = weekLabel;

  rationValue(plan: INutritionPlan | null | undefined, key: keyof INutritionPlan): number {
    const value = plan?.[key];
    return typeof value === 'number' ? value : 0;
  }

  addressLine(patient: IPatient): string {
    const a = patient.address;
    if (!a) return '—';
    const parts = [
      [a.street, a.numberExt].filter(Boolean).join(' '),
      a.neighborhood,
      a.zipCode ? `CP ${a.zipCode}` : null,
      a.city,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  edit(): void {
    const patient = this.patient();
    const dialogRef = this.dialog.open(PacienteModalComponent, {
      width: '760px',
      maxWidth: '100vw',
      disableClose: true,
      data: { patientId: patient.id, isEditMode: true },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.changed.emit();
    });
  }
}
