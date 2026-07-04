import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HotToastService } from '@ngxpert/hot-toast';

import { ICategory } from '@shared/interfaces/common.model';
import {
  CategoriesApiService,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSubcategoryDto,
  UpdateSubcategoryDto,
} from '../api/categories-api.service';

@Injectable({ providedIn: 'root' })
export class CategoriesStateService {
  private readonly api = inject(CategoriesApiService);
  private readonly toast = inject(HotToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly categoriesSignal = signal<ICategory[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly expandedCategoryIdSignal = signal<number | null>(null);

  readonly categories = this.categoriesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly expandedCategoryId = this.expandedCategoryIdSignal.asReadonly();

  readonly categoryCount = computed(() => this.categoriesSignal().length);
  readonly isEmpty = computed(() => !this.loadingSignal() && this.categoryCount() === 0);

  readonly totalSubcategories = computed(() =>
    this.categoriesSignal().reduce((sum, cat) => sum + (cat.subcategories?.length || 0), 0)
  );

  loadCategories(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.api.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categoriesSignal.set(categories);
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Error al cargar categorías:', error);
          this.errorSignal.set('Error al cargar las categorías');
          this.toast.error('Error al cargar las categorías');
          this.loadingSignal.set(false);
        },
      });
  }

  createCategory(data: CreateCategoryDto): void {
    this.loadingSignal.set(true);

    this.api.createCategory(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newCategory) => {
          this.categoriesSignal.update(cats => [...cats, { ...newCategory, subcategories: [] }]);
          this.toast.success('Categoría creada exitosamente');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Error al crear categoría:', error);
          const msg = error.error?.error?.message || error.error?.message || 'Error al crear la categoría';
          this.toast.error(msg);
          this.loadingSignal.set(false);
        },
      });
  }

  updateCategory(id: number, data: UpdateCategoryDto): void {
    this.loadingSignal.set(true);

    this.api.updateCategory(id, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.categoriesSignal.update(cats =>
            cats.map(c => c.id === id ? { ...updated, subcategories: c.subcategories } : c)
          );
          this.toast.success('Categoría actualizada exitosamente');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Error al actualizar categoría:', error);
          const msg = error.error?.error?.message || error.error?.message || 'Error al actualizar la categoría';
          this.toast.error(msg);
          this.loadingSignal.set(false);
        },
      });
  }

  updateCategoryTiers(id: number, enabledTiers: string[]): void {
    this.api.updateCategoryTiers(id, enabledTiers)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.categoriesSignal.update(cats =>
            cats.map(c => c.id === id ? { ...c, enabledTiers: updated.enabledTiers } : c)
          );
          this.toast.success('Visibilidad actualizada');
        },
        error: (error) => {
          console.error('Error al actualizar visibilidad:', error);
          const msg = error.error?.error?.message || error.error?.message || 'Error al actualizar visibilidad';
          this.toast.error(msg);
        },
      });
  }

  updateSubcategoryTiers(subcategoryId: number, categoryId: number, enabledTiers: string[]): void {
    this.api.updateSubcategoryTiers(subcategoryId, enabledTiers)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.categoriesSignal.update(cats =>
            cats.map(c => c.id === categoryId
              ? { ...c, subcategories: c.subcategories.map(s => s.id === subcategoryId ? { ...s, enabledTiers: updated.enabledTiers } : s) }
              : c
            )
          );
          this.toast.success('Visibilidad actualizada');
        },
        error: (error) => {
          console.error('Error al actualizar visibilidad:', error);
          const msg = error.error?.error?.message || error.error?.message || 'Error al actualizar visibilidad';
          this.toast.error(msg);
        },
      });
  }

  deleteCategory(id: number): void {
    this.loadingSignal.set(true);

    this.api.deleteCategory(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.categoriesSignal.update(cats => cats.filter(c => c.id !== id));
          this.toast.success('Categoría eliminada exitosamente');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Error al eliminar categoría:', error);
          const msg = error.error?.error?.message || error.error?.message || 'Error al eliminar la categoría';
          this.toast.error(msg);
          this.loadingSignal.set(false);
        },
      });
  }

  createSubcategory(data: CreateSubcategoryDto): void {
    this.loadingSignal.set(true);

    this.api.createSubcategory(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newSub) => {
          this.categoriesSignal.update(cats =>
            cats.map(c => c.id === data.categoryId
              ? { ...c, subcategories: [...(c.subcategories || []), newSub] }
              : c
            )
          );
          this.toast.success('Subcategoría creada exitosamente');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Error al crear subcategoría:', error);
          const msg = error.error?.error?.message || error.error?.message || 'Error al crear la subcategoría';
          this.toast.error(msg);
          this.loadingSignal.set(false);
        },
      });
  }

  updateSubcategory(id: number, categoryId: number, data: UpdateSubcategoryDto): void {
    this.loadingSignal.set(true);

    this.api.updateSubcategory(id, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.categoriesSignal.update(cats =>
            cats.map(c => c.id === categoryId
              ? { ...c, subcategories: c.subcategories.map(s => s.id === id ? updated : s) }
              : c
            )
          );
          this.toast.success('Subcategoría actualizada exitosamente');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Error al actualizar subcategoría:', error);
          const msg = error.error?.error?.message || error.error?.message || 'Error al actualizar la subcategoría';
          this.toast.error(msg);
          this.loadingSignal.set(false);
        },
      });
  }

  deleteSubcategory(id: number, categoryId: number): void {
    this.loadingSignal.set(true);

    this.api.deleteSubcategory(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.categoriesSignal.update(cats =>
            cats.map(c => c.id === categoryId
              ? { ...c, subcategories: c.subcategories.filter(s => s.id !== id) }
              : c
            )
          );
          this.toast.success('Subcategoría eliminada exitosamente');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Error al eliminar subcategoría:', error);
          const msg = error.error?.error?.message || error.error?.message || 'Error al eliminar la subcategoría';
          this.toast.error(msg);
          this.loadingSignal.set(false);
        },
      });
  }

  removeSubcategory(subcategoryId: number, categoryId: number): void {
    this.categoriesSignal.update(cats =>
      cats.map(c => c.id === categoryId
        ? { ...c, subcategories: c.subcategories.filter(s => s.id !== subcategoryId) }
        : c
      )
    );
  }

  toggleExpanded(categoryId: number): void {
    const current = this.expandedCategoryIdSignal();
    this.expandedCategoryIdSignal.set(current === categoryId ? null : categoryId);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }
}
