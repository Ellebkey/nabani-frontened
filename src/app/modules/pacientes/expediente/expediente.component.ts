import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { DecimalPipe, DatePipe } from '@angular/common';
import { map } from 'rxjs';

import { NbInitComponent } from '@shared/components/nb-init/nb-init.component';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';

import { PacientesService } from '../pacientes.service';
import {
  IPatient, fullName, weekLabel, billingLabel,
} from '../pacientes.models';
import { ResumenTabComponent } from './tabs/resumen-tab.component';
import { ClinicoTabComponent } from './tabs/clinico-tab.component';
import { CalendarioTabComponent } from './tabs/calendario-tab.component';
import { PagosTabComponent } from './tabs/pagos-tab.component';
import { VentaModalComponent } from '../modals/venta-modal/venta-modal.component';
import { ConsultaModalComponent } from '../modals/consulta-modal/consulta-modal.component';

type ExpedienteTab = 'resumen' | 'clinico' | 'calendario' | 'pagos';

@Component({
  selector: 'app-expediente',
  templateUrl: './expediente.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MatButton, MatIcon, DecimalPipe, DatePipe,
    NbInitComponent, ChipComponent, ChipRowComponent,
    ResumenTabComponent, ClinicoTabComponent, CalendarioTabComponent, PagosTabComponent,
  ],
})
export class ExpedienteComponent {
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  protected readonly fullName = fullName;
  protected readonly weekLabel = weekLabel;
  protected readonly billingLabel = billingLabel;

  readonly patient = signal<IPatient | null>(null);
  readonly isLoaded = signal(false);
  readonly reloadTick = signal(0);

  private readonly patientId = toSignal(
    this.route.paramMap.pipe(map(p => Number(p.get('id')))),
    { initialValue: 0 }
  );

  readonly tab = toSignal(
    this.route.queryParamMap.pipe(map(q => (q.get('tab') as ExpedienteTab) || 'resumen')),
    { initialValue: 'resumen' as ExpedienteTab }
  );

  readonly tabs: { value: ExpedienteTab; label: string }[] = [
    { value: 'resumen', label: 'Resumen' },
    { value: 'clinico', label: 'Historial clínico' },
    { value: 'calendario', label: 'Calendario' },
    { value: 'pagos', label: 'Pagos y paquetes' },
  ];

  readonly currentId = computed(() => this.patientId());

  constructor() {
    // Re-fetch the patient whenever the route id changes.
    let lastId = -1;
    this.route.paramMap.pipe(map(p => Number(p.get('id'))), takeUntilDestroyed()).subscribe(id => {
      if (id && id !== lastId) {
        lastId = id;
        this.loadPatient(id);
      }
    });
  }

  private loadPatient(id: number): void {
    this.isLoaded.set(false);
    this.pacientesService.getPatient(id).subscribe({
      next: (patient) => {
        this.patient.set(patient);
        this.isLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.isLoaded.set(true);
      },
    });
  }

  setTab(tab: ExpedienteTab): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  refresh(): void {
    const id = this.currentId();
    if (id) {
      this.loadPatient(id);
    }
    this.reloadTick.update(v => v + 1);
  }

  openVenta(): void {
    const patient = this.patient();
    if (!patient) return;
    const dialogRef = this.dialog.open(VentaModalComponent, {
      width: '560px',
      maxWidth: '100vw',
      disableClose: true,
      data: { patientId: patient.id, patientName: this.fullName(patient) },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.refresh();
    });
  }

  openConsulta(): void {
    const patient = this.patient();
    if (!patient) return;
    const dialogRef = this.dialog.open(ConsultaModalComponent, {
      width: '620px',
      maxWidth: '100vw',
      disableClose: true,
      data: {
        patientId: patient.id,
        patientName: this.fullName(patient),
        defaultKcalId: patient.calorieLevel?.id ?? null,
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.refresh();
    });
  }
}
