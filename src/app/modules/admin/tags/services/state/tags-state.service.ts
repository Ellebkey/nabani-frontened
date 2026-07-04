import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { ITag, CreateTagDto, UpdateTagDto } from '@shared/interfaces/tag.model';
import { PaginationSetting } from '@shared/interfaces/shared.model';
import { TagsApiService } from '../api/tags-api.service';

@Injectable({ providedIn: 'root' })
export class TagsStateService {
  private readonly tagsApi = inject(TagsApiService);
  private readonly toast = inject(HotToastService);
  private readonly destroyRef = inject(DestroyRef);

  // Private writable signals for internal state management
  private readonly tagsSignal = signal<ITag[]>([]);
  private readonly selectedTagSignal = signal<ITag | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly searchQuerySignal = signal('');
  private readonly paginationSignal = signal<PaginationSetting>({
    limit: 25,
    offset: 0,
    searchText: null,
    count: 0,
    showInputSearch: true
  });

  // Public readonly signals for component consumption
  readonly tags = this.tagsSignal.asReadonly();
  readonly selectedTag = this.selectedTagSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly searchQuery = this.searchQuerySignal.asReadonly();
  readonly pagination = this.paginationSignal.asReadonly();

  // Computed signals for derived state
  readonly tagCount = computed(() => this.tagsSignal().length);

  readonly filteredTags = computed(() => {
    const query = this.searchQuerySignal().toLowerCase();
    const tags = this.tagsSignal();

    if (!query) return tags;

    return tags.filter(tag =>
      tag.name.toLowerCase().includes(query)
    );
  });

  readonly hasTags = computed(() => this.tagCount() > 0);

  readonly isEmpty = computed(() =>
    !this.loadingSignal() && this.tagCount() === 0
  );

  readonly isSuccess = computed(() =>
    !this.loadingSignal() && !this.errorSignal() && this.hasTags()
  );

  // Action streams for side effects
  private readonly tagCreated$ = new Subject<ITag>();
  private readonly tagUpdated$ = new Subject<ITag>();
  private readonly tagDeleted$ = new Subject<number>();

  // Public observables for components to react to events
  readonly tagCreated = this.tagCreated$.asObservable();
  readonly tagUpdated = this.tagUpdated$.asObservable();
  readonly tagDeleted = this.tagDeleted$.asObservable();

  /**
   * Load all tags from the API with current pagination settings
   */
  loadTags(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const currentPagination = this.paginationSignal();

    this.tagsApi.getTags({
      limit: currentPagination.limit,
      offset: currentPagination.offset,
      searchText: currentPagination.searchText || undefined
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.tagsSignal.set(response.rows);
          this.paginationSignal.update(p => ({ ...p, count: response.count }));
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Failed to load tags:', error);
          this.errorSignal.set('Error al cargar las etiquetas');
          this.toast.error('Error al cargar las etiquetas');
          this.loadingSignal.set(false);
        }
      });
  }

  /**
   * Create a new tag
   */
  createTag(tagData: CreateTagDto): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.tagsApi.createTag(tagData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newTag) => {
          // Update signal with server response (has real ID)
          this.tagsSignal.update(tags => [...tags, newTag]);
          // Update pagination count
          this.paginationSignal.update(p => ({ ...p, count: (p.count ?? 0) + 1 }));
          this.tagCreated$.next(newTag);
          this.toast.success('Etiqueta creada exitosamente');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Create tag error:', error);
          this.errorSignal.set('Error al crear la etiqueta');
          this.toast.error('Error al crear la etiqueta');
          this.loadingSignal.set(false);
        }
      });
  }

  /**
   * Update an existing tag
   */
  updateTag(id: number, tagData: UpdateTagDto): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.tagsApi.updateTag(id, tagData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedTag) => {
          this.tagsSignal.update(tags =>
            tags.map(t => t.id === id ? updatedTag : t)
          );

          if (this.selectedTagSignal()?.id === id) {
            this.selectedTagSignal.set(updatedTag);
          }

          this.tagUpdated$.next(updatedTag);
          this.toast.success('Etiqueta actualizada exitosamente');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Update tag error:', error);
          this.errorSignal.set('Error al actualizar la etiqueta');
          this.toast.error('Error al actualizar la etiqueta');
          this.loadingSignal.set(false);
        }
      });
  }

  /**
   * Delete a tag
   */
  deleteTag(id: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.tagsApi.deleteTag(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Remove from signal after server confirms
          this.tagsSignal.update(tags => tags.filter(t => t.id !== id));
          // Update pagination count
          this.paginationSignal.update(p => ({ ...p, count: Math.max(0, (p.count ?? 0) - 1) }));

          if (this.selectedTagSignal()?.id === id) {
            this.selectedTagSignal.set(null);
          }

          this.tagDeleted$.next(id);
          this.toast.success('Etiqueta eliminada exitosamente');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Delete tag error:', error);
          this.errorSignal.set('Error al eliminar la etiqueta');
          this.toast.error('Error al eliminar la etiqueta');
          this.loadingSignal.set(false);
        }
      });
  }

  /**
   * Update pagination settings and reload tags
   */
  updatePagination(paginationUpdate: Partial<PaginationSetting>): void {
    this.paginationSignal.update(current => ({ ...current, ...paginationUpdate }));
    this.loadTags();
  }

  /**
   * Set the search query for filtering
   */
  setSearchQuery(query: string): void {
    this.searchQuerySignal.set(query);
  }

  /**
   * Select a tag
   */
  selectTag(tag: ITag | null): void {
    this.selectedTagSignal.set(tag);
  }

  /**
   * Clear any errors
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Reset the state
   */
  resetState(): void {
    this.tagsSignal.set([]);
    this.selectedTagSignal.set(null);
    this.searchQuerySignal.set('');
    this.paginationSignal.set({
      limit: 25,
      offset: 0,
      searchText: null,
      count: 0,
      showInputSearch: true
    });
    this.errorSignal.set(null);
    this.loadingSignal.set(false);
  }
}
