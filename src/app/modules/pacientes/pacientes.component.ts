import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { DecimalPipe, DatePipe } from '@angular/common';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { HotToastService } from '@ngxpert/hot-toast';
import { isToday, parseISO } from 'date-fns';

import { PaginationService } from '@shared/services/pagination.service';
import { PaginationSetting } from '@shared/interfaces/shared.model';
import { PageEvent, PagerComponent } from '@shared/components/pager/pager.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { NbInitComponent } from '@shared/components/nb-init/nb-init.component';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';

import { PacientesService } from './pacientes.service';
import { IPatient, PatientFilter, fullName } from './pacientes.models';
import { PacienteModalComponent } from './modals/paciente-modal/paciente-modal.component';

@Component({
  selector: 'app-pacientes',
  templateUrl: './pacientes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, MatButton, MatIcon,
    MatMenuTrigger, MatMenu, MatMenuItem, DecimalPipe, DatePipe,
    PagerComponent, EmptyStateComponent, PillComponent, NbInitComponent,
    ChipComponent, ChipRowComponent,
  ],
})
export class PacientesComponent implements OnInit, OnDestroy {
  private pacientesService = inject(PacientesService);
  private paginationService = inject(PaginationService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private toast = inject(HotToastService);

  private readonly destroy$ = new Subject<void>();

  readonly patients = signal<IPatient[]>([]);
  readonly menuPatient = signal<IPatient | null>(null);
  readonly isDataLoaded = signal(false);
  readonly pagination = signal<PaginationSetting>(this.paginationService.getDefaultPagination(true));
  readonly filter = signal<PatientFilter>('activos');
  readonly activeCount = signal(0);
  readonly inactiveCount = signal(0);

  readonly searchControl = new FormControl('');
  protected readonly fullName = fullName;
  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  readonly filters: { value: PatientFilter; label: string }[] = [
    { value: 'activos', label: 'Activos' },
    { value: 'inactivos', label: 'Inactivos' },
    { value: 'porVencer', label: 'Por vencer' },
  ];

  readonly subtitle = computed(() =>
    `${this.activeCount().toLocaleString('es-MX')} activos · ${this.inactiveCount().toLocaleString('es-MX')} inactivos`
  );

  ngOnInit(): void {
    this.loadCounts();
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

  private loadCounts(): void {
    this.pacientesService.getPatients({ status: 'activo', limit: 1, offset: 0 }).subscribe({
      next: (r) => this.activeCount.set(r.count ?? 0),
      error: () => {},
    });
    this.pacientesService.getPatients({ status: 'inactivo', limit: 1, offset: 0 }).subscribe({
      next: (r) => this.inactiveCount.set(r.count ?? 0),
      error: () => {},
    });
  }

  private queryForFilter(): { status?: string; porVencer?: boolean } {
    const f = this.filter();
    if (f === 'activos') return { status: 'activo' };
    if (f === 'inactivos') return { status: 'inactivo' };
    return { status: 'activo', porVencer: true };
  }

  loadData(): void {
    this.isDataLoaded.set(false);
    const pagination = this.pagination();
    this.pacientesService.getPatients({
      limit: pagination.limit,
      offset: pagination.offset,
      searchText: pagination.searchText,
      ...this.queryForFilter(),
    }).subscribe({
      next: (response) => {
        this.patients.set(response.rows ?? []);
        this.pagination.update(p => ({ ...p, count: response.count ?? 0 }));
        this.isDataLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.isDataLoaded.set(true);
      },
    });
  }

  setFilter(filter: PatientFilter): void {
    if (this.filter() === filter) return;
    this.filter.set(filter);
    this.pagination.update(p => ({ ...p, offset: 0 }));
    this.loadData();
  }

  onPageChange(event: PageEvent): void {
    this.pagination.update(p => ({ ...p, limit: event.limit, offset: event.offset }));
    this.loadData();
  }

  isDueToday(dateStr: string | null | undefined): boolean {
    if (!dateStr) return false;
    try {
      return isToday(parseISO(dateStr));
    } catch {
      return false;
    }
  }

  openPatient(patient: IPatient): void {
    this.router.navigate(['/pacientes', patient.id]);
  }

  openCreate(): void {
    const dialogRef = this.dialog.open(PacienteModalComponent, {
      width: '760px',
      maxWidth: '100vw',
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCounts();
        this.loadData();
      }
    });
  }

  edit(patient: IPatient): void {
    const dialogRef = this.dialog.open(PacienteModalComponent, {
      width: '760px',
      maxWidth: '100vw',
      disableClose: true,
      data: { patientId: patient.id, isEditMode: true },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCounts();
        this.loadData();
      }
    });
  }

  toggleStatus(patient: IPatient): void {
    const nextStatus = (patient.status ?? '').toLowerCase() === 'activo' ? 'inactivo' : 'activo';
    this.pacientesService.updateStatus(patient.id, nextStatus).subscribe({
      next: () => {
        this.toast.success('Estado actualizado');
        this.loadCounts();
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Error al actualizar el estado');
        return of(err);
      },
    });
  }
}
