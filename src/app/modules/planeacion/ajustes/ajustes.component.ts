import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { NbInitComponent } from '@shared/components/nb-init/nb-init.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

import { PlaneacionService } from '../planeacion.service';
import { PlaneacionNavComponent } from '../components/planeacion-nav.component';
import { SwapModalComponent, SwapModalData, SwapModalResult } from './swap-modal/swap-modal.component';
import {
  AdjustmentFilter,
  IAdjustmentRow,
  IAdjustmentsSummary,
  IAdjustmentDetail,
  IAdjustmentMeal,
  IAdjustmentIngredient,
  mealSlotMeta,
  formatLongDate,
  todayIso,
} from '../planeacion.models';

@Component({
  selector: 'app-ajustes',
  templateUrl: './ajustes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton, MatIcon, DecimalPipe,
    NbInitComponent, PillComponent, ChipComponent, ChipRowComponent, EmptyStateComponent,
    PlaneacionNavComponent,
  ],
})
export class AjustesComponent {
  private planeacionService = inject(PlaneacionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private toast = inject(HotToastService);

  protected readonly mealSlotMeta = mealSlotMeta;
  protected readonly formatLongDate = formatLongDate;

  readonly date = toSignal(
    this.route.queryParamMap.pipe(map(q => q.get('date') || todayIso())),
    { initialValue: todayIso() },
  );

  readonly filter = signal<AdjustmentFilter>('todos');
  readonly rows = signal<IAdjustmentRow[]>([]);
  readonly summary = signal<IAdjustmentsSummary>({ total: 0, listos: 0, conflictos: 0 });
  readonly listLoaded = signal(false);

  readonly selectedId = signal<number | null>(null);
  readonly detail = signal<IAdjustmentDetail | null>(null);
  readonly detailLoaded = signal(false);
  readonly markedReady = signal<Set<number>>(new Set());
  readonly authorizing = signal(false);

  readonly filters: { value: AdjustmentFilter; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'conflictos', label: 'Conflictos' },
    { value: 'listos', label: 'Listos' },
  ];

  readonly headSubtitle = computed(() =>
    `El menú base se aplicó a ${this.summary().total} pacientes · solo revisa los conflictos`,
  );

  constructor() {
    let lastDate = '';
    this.route.queryParamMap
      .pipe(map(q => q.get('date') || todayIso()), takeUntilDestroyed())
      .subscribe(date => {
        if (date !== lastDate) {
          lastDate = date;
          this.loadList(true);
        }
      });
  }

  loadList(selectFirst: boolean): void {
    this.listLoaded.set(false);
    this.planeacionService.getAdjustments(this.date(), this.filter()).subscribe({
      next: (response) => {
        this.rows.set(response.rows ?? []);
        this.summary.set(response.summary ?? { total: 0, listos: 0, conflictos: 0 });
        this.listLoaded.set(true);
        if (selectFirst) {
          const first = response.rows?.[0] ?? null;
          if (first) {
            this.select(first);
          } else {
            this.selectedId.set(null);
            this.detail.set(null);
            this.detailLoaded.set(true);
          }
        }
      },
      error: (err) => {
        console.error(err);
        this.rows.set([]);
        this.listLoaded.set(true);
      },
    });
  }

  setFilter(filter: AdjustmentFilter): void {
    if (this.filter() === filter) return;
    this.filter.set(filter);
    this.loadList(true);
  }

  select(row: IAdjustmentRow): void {
    this.selectedId.set(row.deliveryDayId);
    this.loadDetail(row.deliveryDayId);
  }

  private loadDetail(deliveryDayId: number): void {
    this.detailLoaded.set(false);
    this.planeacionService.getAdjustmentDetail(deliveryDayId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.detailLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.detail.set(null);
        this.detailLoaded.set(true);
      },
    });
  }

  patientName(patient: { firstName: string; lastName: string }): string {
    return `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim();
  }

  rowSubtitle(row: IAdjustmentRow): string {
    const kcal = row.calorieLevel?.kcal ? `${row.calorieLevel.kcal.toLocaleString('es-MX')} kcal` : 'Sin nivel';
    const pkg = row.package?.code ?? 'Sin paquete';
    return `${kcal} · ${pkg}`;
  }

  detailSubtitle(detail: IAdjustmentDetail): string {
    const kcal = detail.calorieLevel?.kcal ? `${detail.calorieLevel.kcal.toLocaleString('es-MX')} kcal` : 'Sin nivel';
    const pkg = detail.package?.code ? `Paquete ${detail.package.code}` : 'Sin paquete';
    const prefs = (detail.preferences ?? []).map(p => p.name).join(', ');
    return prefs ? `${kcal} · ${pkg} · ${prefs}` : `${kcal} · ${pkg}`;
  }

  hasConflicts(row: IAdjustmentRow): boolean {
    return (row.conflictCount ?? 0) > 0;
  }

  chipCount(value: AdjustmentFilter): number {
    const summary = this.summary();
    if (value === 'todos') return summary.total;
    if (value === 'conflictos') return summary.conflictos;
    return summary.listos;
  }

  isMarkedReady(deliveryDayId: number): boolean {
    return this.markedReady().has(deliveryDayId);
  }

  isRowReady(row: IAdjustmentRow): boolean {
    return row.status === 'listo' || this.markedReady().has(row.deliveryDayId);
  }

  openSwap(meal: IAdjustmentMeal, ingredient: IAdjustmentIngredient): void {
    const id = this.selectedId();
    if (id == null) return;
    const dialogRef = this.dialog.open(SwapModalComponent, {
      width: '520px',
      maxWidth: '100vw',
      disableClose: true,
      data: {
        deliveryDayId: id,
        ingredient,
        mealSlotLabel: mealSlotMeta(meal.mealSlot).label,
        conflictType: ingredient.conflictType,
        patientName: this.detail() ? this.patientName(this.detail()!.patient) : '',
      } satisfies SwapModalData,
    });
    dialogRef.afterClosed().subscribe((result: SwapModalResult | undefined) => {
      if (result) {
        this.loadDetail(id);
        this.loadList(false);
      }
    });
  }

  eliminateRow(ingredient: IAdjustmentIngredient): void {
    const id = this.selectedId();
    if (id == null) return;
    this.planeacionService.eliminateIngredient(id, ingredient.id).pipe(
      this.toast.observe({
        loading: 'Eliminando de la comida...',
        success: 'Ingrediente eliminado de la comida',
        error: 'Error al eliminar el ingrediente',
      }),
    ).subscribe({
      next: () => {
        this.loadDetail(id);
        this.loadList(false);
      },
      error: (err) => {
        console.error(err);
        return of(err);
      },
    });
  }

  markReady(): void {
    const id = this.selectedId();
    if (id == null) return;
    this.markedReady.update(set => {
      const next = new Set(set);
      next.add(id);
      return next;
    });
    this.toast.success('Paciente marcado como listo');
  }

  authorizeAll(): void {
    if (this.authorizing()) return;
    this.authorizing.set(true);
    // Fetch the full "listos" list so authorization isn't limited by the active filter.
    this.planeacionService.getAdjustments(this.date(), 'listos').subscribe({
      next: (response) => {
        const ids = new Set<number>();
        for (const row of response.rows ?? []) {
          if (!row.authorized) ids.add(row.deliveryDayId);
        }
        for (const markedId of this.markedReady()) {
          ids.add(markedId);
        }
        const deliveryDayIds = Array.from(ids);
        if (!deliveryDayIds.length) {
          this.authorizing.set(false);
          this.toast.info('No hay pacientes listos para autorizar');
          return;
        }
        this.planeacionService.authorize(deliveryDayIds).pipe(
          this.toast.observe({
            loading: 'Autorizando pacientes...',
            success: `${deliveryDayIds.length} pacientes autorizados`,
            error: 'Error al autorizar',
          }),
        ).subscribe({
          next: () => {
            this.authorizing.set(false);
            this.markedReady.set(new Set());
            this.loadList(true);
          },
          error: (err) => {
            this.authorizing.set(false);
            console.error(err);
            return of(err);
          },
        });
      },
      error: (err) => {
        this.authorizing.set(false);
        console.error(err);
        return of(err);
      },
    });
  }

  goToMenu(): void {
    this.router.navigate(['/planeacion/dia'], { queryParams: { date: this.date() } });
  }
}
