import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { DecimalPipe } from '@angular/common';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@maguey/services/confirmation';

import { PaginationService } from '@shared/services/pagination.service';
import { CommonService } from '@shared/services/common.service';
import { PaginationSetting } from '@shared/interfaces/shared.model';
import { PageEvent, PagerComponent } from '@shared/components/pager/pager.component';
import { CompactSelectComponent, MgSelectOption } from '@shared/components/compact-select/compact-select.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PillComponent } from '@shared/components/pill/pill.component';

import { CatalogosService } from '../catalogos.service';
import { CatalogosNavComponent } from '../components/catalogos-nav.component';
import { IIngredient, IDisease, foodGroupMeta } from '../catalogos.models';
import { IngredienteModalComponent } from './ingrediente-modal/ingrediente-modal.component';

@Component({
  selector: 'app-ingredientes',
  templateUrl: './ingredientes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, MatButton, MatIcon, MatMenuTrigger, MatMenu, MatMenuItem,
    DecimalPipe, PagerComponent, CompactSelectComponent, EmptyStateComponent,
    PillComponent, CatalogosNavComponent,
  ],
})
export class IngredientesComponent implements OnInit, OnDestroy {
  private catalogosService = inject(CatalogosService);
  private paginationService = inject(PaginationService);
  private common = inject(CommonService);
  private magueyConfirmationService = inject(MagueyConfirmationService);
  private dialog = inject(MatDialog);
  private toast = inject(HotToastService);

  private readonly destroy$ = new Subject<void>();

  readonly ingredients = signal<IIngredient[]>([]);
  readonly diseases = signal<IDisease[]>([]);
  readonly menuIngredient = signal<IIngredient | null>(null);
  readonly isDataLoaded = signal(false);
  readonly pagination = signal<PaginationSetting>(this.paginationService.getDefaultPagination(true));
  readonly selectedDiseaseId = signal<number | null>(null);

  readonly searchControl = new FormControl('');
  protected readonly foodGroupMeta = foodGroupMeta;
  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  readonly diseaseOptions = computed<MgSelectOption[]>(() => [
    { value: null as unknown as number, label: 'Todas las enfermedades' },
    ...this.diseases().map(d => ({ value: d.id, label: d.name })),
  ]);

  ngOnInit(): void {
    this.loadDiseases();
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

  private loadDiseases(): void {
    this.catalogosService.getDiseases().subscribe({
      next: (response) => this.diseases.set(response.rows ?? []),
      error: (err) => console.error(err),
    });
  }

  loadData(): void {
    this.isDataLoaded.set(false);
    const pagination = this.pagination();
    const diseaseId = this.selectedDiseaseId();

    this.catalogosService.getIngredients({
      limit: pagination.limit,
      offset: pagination.offset,
      searchText: pagination.searchText,
      ...(diseaseId != null && { diseaseId }),
    }).subscribe({
      next: (response) => {
        this.ingredients.set(response.rows ?? []);
        this.pagination.update(p => ({ ...p, count: response.count ?? 0 }));
        this.isDataLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.isDataLoaded.set(true);
      },
    });
  }

  onDiseaseChange(diseaseId: number | null): void {
    this.selectedDiseaseId.set(diseaseId);
    this.pagination.update(p => ({ ...p, offset: 0 }));
    this.loadData();
  }

  onPageChange(event: PageEvent): void {
    this.pagination.update(p => ({ ...p, limit: event.limit, offset: event.offset }));
    this.loadData();
  }

  openCreate(): void {
    const dialogRef = this.dialog.open(IngredienteModalComponent, {
      width: '560px',
      maxWidth: '100vw',
      disableClose: true,
      data: { diseases: this.diseases() },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  edit(ingredient: IIngredient): void {
    const dialogRef = this.dialog.open(IngredienteModalComponent, {
      width: '560px',
      maxWidth: '100vw',
      disableClose: true,
      data: { ingredient, diseases: this.diseases(), isEditMode: true },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  delete(ingredient: IIngredient): void {
    const dialogData = this.common.getDefaultDeleteConfirmation({ objectName: 'ingredient' });
    const confirmDialog = this.magueyConfirmationService.open(dialogData);
    confirmDialog.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.catalogosService.deleteIngredient(ingredient.id).subscribe({
          next: () => {
            this.loadData();
            this.toast.info('El ingrediente fue eliminado correctamente.');
          },
          error: (err) => {
            console.error(err);
            return of(err);
          },
        });
      }
    });
  }
}
