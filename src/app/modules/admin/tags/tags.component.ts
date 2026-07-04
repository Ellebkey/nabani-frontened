import { Component, inject, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { PagerComponent, PageEvent } from '@shared/components/pager/pager.component';
import { TileComponent } from '@shared/components/tile/tile.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

import { TagFormModalComponent } from './modals/tag-form-modal/tag-form-modal.component';
import { TagsStateService } from './services/state/tags-state.service';
import { ITag, CreateTagDto, UpdateTagDto } from '@shared/interfaces/tag.model';

@Component({
    selector: 'app-tags',
    templateUrl: './tags.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    ReactiveFormsModule,
    PagerComponent,
    TileComponent,
    SkeletonComponent,
    EmptyStateComponent
]
})
export class TagsComponent implements OnInit {
  private readonly tagsState = inject(TagsStateService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly searchControl = new FormControl('');

  // Direct access to service signals
  protected readonly tags = this.tagsState.tags;
  protected readonly isLoading = this.tagsState.loading;
  protected readonly error = this.tagsState.error;
  protected readonly pagination = this.tagsState.pagination;
  protected readonly isEmpty = this.tagsState.isEmpty;

  ngOnInit(): void {
    this.tagsState.loadTags();
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.tagsState.updatePagination({ searchText: value?.trim() || null, offset: 0 });
      });
  }

  protected onPageChange(event: PageEvent): void {
    this.tagsState.updatePagination(event);
  }

  protected openCreateModal(): void {
    const dialogRef = this.dialog.open(TagFormModalComponent, {
      width: '420px',
      disableClose: true,
      data: null
    });

    dialogRef.afterClosed().subscribe((result: CreateTagDto | null) => {
      if (result) {
        this.tagsState.createTag(result);
      }
    });
  }

  protected openEditModal(tag: ITag): void {
    const dialogRef = this.dialog.open(TagFormModalComponent, {
      width: '420px',
      disableClose: true,
      data: tag
    });

    dialogRef.afterClosed().subscribe((result: UpdateTagDto | null) => {
      if (result) {
        this.tagsState.updateTag(tag.id, result);
      }
    });
  }

  protected deleteTag(tag: ITag): void {
    if (confirm(`¿Estás seguro de eliminar la etiqueta "${tag.name}"?`)) {
      this.tagsState.deleteTag(tag.id);
    }
  }
}
