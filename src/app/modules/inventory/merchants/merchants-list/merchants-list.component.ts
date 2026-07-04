import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { PageEvent } from '@shared/components/pager/pager.component';
import { MatDialog } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@maguey/services/confirmation';

import { MerchantsService } from '../../merchants.service';
import { PaginationService } from '@shared/services/pagination.service';
import { CommonService } from '@shared/services/common.service';
import { AlertService } from '@shared/services/alert.service';
import { IMerchant } from '@shared/interfaces/merchant.model';
import { PaginationSetting } from '@shared/interfaces/shared.model';

import { CreateMerchantModalComponent } from '../create-merchant-modal/create-merchant-modal.component';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PagerComponent } from '../../../shared/components/pager/pager.component';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { DecimalPipe } from '@angular/common';

@Component({
    selector: 'app-merchants-list',
    templateUrl: './merchants-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, MatButton, MatIcon, EmptyStateComponent, FormsModule, ReactiveFormsModule, PagerComponent, MatSlideToggle, MatMenuTrigger, MatMenu, MatMenuItem, DecimalPipe]
})
export class MerchantsListComponent implements OnInit, OnDestroy {
  private merchantsService = inject(MerchantsService);
  private paginationService = inject(PaginationService);
  private toast = inject(HotToastService);
  dialog = inject(MatDialog);
  private common = inject(CommonService);
  private magueyConfirmationService = inject(MagueyConfirmationService);
  private _alertService = inject(AlertService);


  private readonly destroy$ = new Subject<void>();
  readonly merchants = signal<IMerchant[]>([]);
  readonly menuMerchant = signal<IMerchant | null>(null);
  searchControl = new FormControl('');
  selection = new SelectionModel<IMerchant>(true, []);
  private readonly selectionChanged = toSignal(this.selection.changed);
  readonly selectedCount = computed(() => {
    this.selectionChanged();
    return this.selection.selected.length;
  });
  readonly pagination = signal<PaginationSetting>(this.paginationService.getDefaultPagination(true));

  ngOnInit(): void {
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

  private loadData(): void {
    this.merchantsService.getMerchantsList({
      limit: this.pagination().limit,
      offset: this.pagination().offset,
      searchText: this.pagination().searchText,
      fetchAll: 'true',
    }).subscribe({
      next: (results) => {
        this.merchants.set(results.rows);
        this.pagination.update(p => ({ ...p, count: results.count }));
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  openCreateMerchant(): void {
    const dialogRef = this.dialog.open(CreateMerchantModalComponent, {
      disableClose: true,
      width: '440px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  editMerchant(merchant: IMerchant): void {
    const dialogRef = this.dialog.open(CreateMerchantModalComponent, {
      disableClose: true,
      width: '500px',
      data: merchant
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  public submitChanges(): void {
    this.merchantsService.updateMerchantsState(this.selection.selected)
        .pipe(
            this.toast.observe({
              loading: 'Guardando...',
              success: 'Beneficiarios actualizados exitosamente',
              error: 'Error al guardar los beneficiarios'
            }),
            catchError((error) => {
              console.log(error);
              return of(error);
            })
        ).subscribe({
          next: () => {
            // Clear selection and reload data on success
            this.selection.clear();
            this.loadData();
          },
          error: (error) => {
            // Keep selection on error for user to retry
            console.error('Error updating merchants:', error);
          }
        });
  }

  toggleStatus(checked: boolean, item: IMerchant): void {
    item.isEnabled = checked;
    this.selection.select(item);
  }

  clearSelection(): void {
    this.selection.clear();
    // Reset all items to their original state by reloading data
    this.loadData();
  }

  onPageChange(event: PageEvent): void {
    this.pagination.update(p => ({ ...p, limit: event.limit, offset: event.offset }));
    this.loadData();
  }

  async deleteMerchant(merchant: IMerchant) {
    const dialogData = this.common.getDefaultDeleteConfirmation({
      objectName: 'beneficiario'
    });
    const confirmDialog = this.magueyConfirmationService.open(dialogData);

    confirmDialog.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.merchantsService.destroyMerchant(merchant.id)
          .subscribe({
            next: () => {
              this.loadData();
              this.toast.info('El registro fue eliminado correctamente.');
            },
            error: (err) => {
              console.error(err);
              this._alertService.error(err.error.message, {
                duration: 10000,
                appearance: 'outline'
              });
            }
          })
      }
    });
  }
}
