import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@maguey/services/confirmation';

import { ArticlesService } from '../../articles.service';
import { PaginationService } from '@shared/services/pagination.service';
import { CommonService } from '@shared/services/common.service';
import { AlertService } from '@shared/services/alert.service';
import { IArticle } from '@shared/interfaces/article.model';
import { PaginationSetting } from '@shared/interfaces/shared.model';
import { CreateArticleModalComponent } from '../create-article-modal/create-article-modal.component';
import { PageEvent } from '@shared/components/pager/pager.component';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PagerComponent } from '../../../shared/components/pager/pager.component';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { DecimalPipe } from '@angular/common';

@Component({
    selector: 'app-articles',
    templateUrl: './articles-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, MatButton, MatIcon, EmptyStateComponent, FormsModule, ReactiveFormsModule, PagerComponent, MatSlideToggle, MatMenuTrigger, MatMenu, MatMenuItem, DecimalPipe]
})
export class ArticlesListComponent implements OnInit, OnDestroy {
  private articleService = inject(ArticlesService);
  private paginationService = inject(PaginationService);
  private toast = inject(HotToastService);
  dialog = inject(MatDialog);
  private common = inject(CommonService);
  private magueyConfirmationService = inject(MagueyConfirmationService);
  private _alertService = inject(AlertService);


  private readonly destroy$ = new Subject<void>();
  readonly articles = signal<IArticle[]>([]);
  readonly menuArticle = signal<IArticle | null>(null);
  searchControl = new FormControl('');
  selection = new SelectionModel<IArticle>(true, []);
  private readonly selectionChanged = toSignal(this.selection.changed);
  readonly selectedCount = computed(() => {
    this.selectionChanged();
    return this.selection.selected.length;
  });
  readonly pagination = signal<PaginationSetting>(this.paginationService.getDefaultPagination(true));

  public ngOnInit(): void {
    this.loadData();
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(value => {
        this.pagination.update(p => ({ ...p, searchText: value?.trim() || null, offset: 0 }));
        this.loadData();
      });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.articleService.getArticleList({
      limit: this.pagination().limit,
      offset: this.pagination().offset,
      searchText: this.pagination().searchText,
      fetchAll: 'true',
    }).subscribe({
      next: (results) => {
        this.articles.set(results.rows);
        this.pagination.update(p => ({ ...p, count: results.count }));
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  openCreateArticle(): void {
    const dialogRef = this.dialog.open(CreateArticleModalComponent, {
      disableClose: true,
      width: '440px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  submitChanges(): void {
    this.articleService.updateArticleState(this.selection.selected)
        .pipe(
            this.toast.observe({
              loading: 'Guardando...',
              success: 'Articulos actualizados exitosamente',
              error: 'Error al guardar los articulos'
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
            console.error('Error updating articles:', error);
          }
        });
  }

  toggleStatus(checked: boolean, item: IArticle): void {
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

  deleteArticle(article: IArticle) {
    const dialogData = this.common.getDefaultDeleteConfirmation({
      objectName: 'article'
    });
    const confirmDialog = this.magueyConfirmationService.open(dialogData);

    confirmDialog.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.articleService.destroyArticle(article.id)
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

  editDetailsArticle(article: IArticle) {
    const dialogRef = this.dialog.open(CreateArticleModalComponent, {
      disableClose: true,
      data: article,
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }
}
