import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, inject } from '@angular/core';
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
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PillComponent } from '@shared/components/pill/pill.component';

import { CatalogosService } from '../catalogos.service';
import { CatalogosNavComponent } from '../components/catalogos-nav.component';
import { IUser, roleMeta } from '../catalogos.models';
import { UsuarioModalComponent } from './usuario-modal/usuario-modal.component';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, MatButton, MatIcon, MatMenuTrigger, MatMenu, MatMenuItem,
    DecimalPipe, PagerComponent, EmptyStateComponent, PillComponent, CatalogosNavComponent,
  ],
})
export class UsuariosComponent implements OnInit, OnDestroy {
  private catalogosService = inject(CatalogosService);
  private paginationService = inject(PaginationService);
  private common = inject(CommonService);
  private magueyConfirmationService = inject(MagueyConfirmationService);
  private dialog = inject(MatDialog);
  private toast = inject(HotToastService);

  private readonly destroy$ = new Subject<void>();

  readonly users = signal<IUser[]>([]);
  readonly menuUser = signal<IUser | null>(null);
  readonly isDataLoaded = signal(false);
  readonly pagination = signal<PaginationSetting>(this.paginationService.getDefaultPagination(true));

  readonly searchControl = new FormControl('');
  protected readonly roleMeta = roleMeta;
  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];

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

  loadData(): void {
    this.isDataLoaded.set(false);
    const pagination = this.pagination();
    this.catalogosService.getUsers({
      limit: pagination.limit,
      offset: pagination.offset,
      searchText: pagination.searchText,
    }).subscribe({
      next: (response) => {
        this.users.set(response.rows ?? []);
        this.pagination.update(p => ({ ...p, count: response.count ?? 0 }));
        this.isDataLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.isDataLoaded.set(true);
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pagination.update(p => ({ ...p, limit: event.limit, offset: event.offset }));
    this.loadData();
  }

  openCreate(): void {
    const dialogRef = this.dialog.open(UsuarioModalComponent, {
      width: '520px',
      maxWidth: '100vw',
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  edit(user: IUser): void {
    const dialogRef = this.dialog.open(UsuarioModalComponent, {
      width: '520px',
      maxWidth: '100vw',
      disableClose: true,
      data: { user, isEditMode: true },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  delete(user: IUser): void {
    const dialogData = this.common.getDefaultDeleteConfirmation({ objectName: 'user' });
    const confirmDialog = this.magueyConfirmationService.open(dialogData);
    confirmDialog.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.catalogosService.deleteUser(user.id).subscribe({
          next: () => {
            this.loadData();
            this.toast.info('El registro fue eliminado correctamente.');
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
