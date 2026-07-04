import { Component, inject, signal, OnInit, ChangeDetectionStrategy, ElementRef } from '@angular/core';
import { MAGUEY_USER_COLORS } from '@shared/services/maguey-palette';

import { TileComponent } from '@shared/components/tile/tile.component';
import { DotComponent } from '@shared/components/dot/dot.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { CategoriesStateService } from './services/state/categories-state.service';
import { CategoryFormModalComponent } from './modals/category-form-modal/category-form-modal.component';
import { SubcategoryFormModalComponent, SubcategoryFormData } from './modals/subcategory-form-modal/subcategory-form-modal.component';
import { SubcategoryDeleteModalComponent, SubcategoryDeleteData } from './modals/subcategory-delete-modal/subcategory-delete-modal.component';
import { ICategory, ISubcategory } from '@shared/interfaces/common.model';
import { CreateCategoryDto, CreateSubcategoryDto } from './services/api/categories-api.service';

const PALETTE_COLORS = MAGUEY_USER_COLORS;

@Component({
    selector: 'app-categories-management',
    templateUrl: './categories-management.component.html',
    styleUrls: ['./categories-management.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    TileComponent,
    DotComponent,
    SkeletonComponent,
    EmptyStateComponent
]
})
export class CategoriesManagementComponent implements OnInit {
  private readonly state = inject(CategoriesStateService);
  private readonly dialog = inject(MatDialog);
  private readonly elementRef = inject(ElementRef);

  protected readonly categories = this.state.categories;
  protected readonly isLoading = this.state.loading;
  protected readonly isEmpty = this.state.isEmpty;
  protected readonly categoryCount = this.state.categoryCount;
  protected readonly totalSubcategories = this.state.totalSubcategories;
  protected readonly expandedCategoryId = this.state.expandedCategoryId;
  protected readonly paletteColors = PALETTE_COLORS;

  protected readonly editingCategoryId = signal<number | null>(null);
  protected readonly editingName = signal('');
  protected readonly colorPickerCategoryId = signal<number | null>(null);

  ngOnInit(): void {
    this.state.loadCategories();
  }

  protected toggleExpanded(categoryId: number): void {
    if (this.editingCategoryId() === categoryId) return;
    this.state.toggleExpanded(categoryId);
  }

  protected openCreateCategoryModal(): void {
    const dialogRef = this.dialog.open(CategoryFormModalComponent, {
      width: '420px',
      disableClose: true,
      data: null,
    });

    dialogRef.afterClosed().subscribe((result: CreateCategoryDto | null) => {
      if (result) {
        this.state.createCategory(result);
      }
    });
  }

  protected startEditingName(category: ICategory, event: Event): void {
    event.stopPropagation();
    this.editingCategoryId.set(category.id);
    this.editingName.set(category.name);
    setTimeout(() => {
      const input = this.elementRef.nativeElement.querySelector('#nameInput') as HTMLInputElement;
      input?.focus();
      input?.select();
    });
  }

  protected saveName(category: ICategory): void {
    const newName = this.editingName().trim();
    this.editingCategoryId.set(null);
    if (newName && newName !== category.name) {
      this.state.updateCategory(category.id, { name: newName });
    }
  }

  protected cancelEditing(): void {
    this.editingCategoryId.set(null);
  }

  protected onNameKeydown(event: KeyboardEvent, category: ICategory): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveName(category);
    } else if (event.key === 'Escape') {
      this.cancelEditing();
    }
  }

  protected toggleColorPicker(categoryId: number, event: Event): void {
    event.stopPropagation();
    this.colorPickerCategoryId.set(
      this.colorPickerCategoryId() === categoryId ? null : categoryId
    );
  }

  protected updateColor(category: ICategory, color: string): void {
    const newColor = category.colorPalette === color ? null : color;
    this.colorPickerCategoryId.set(null);
    this.state.updateCategory(category.id, { colorPalette: newColor });
  }

  protected deleteCategory(category: ICategory): void {
    const subcatCount = category.subcategories?.length || 0;
    const msg = subcatCount > 0
      ? `¿Eliminar "${category.name}" y sus ${subcatCount} subcategorías?`
      : `¿Eliminar la categoría "${category.name}"?`;

    if (confirm(msg)) {
      this.state.deleteCategory(category.id);
    }
  }

  protected openCreateSubcategoryModal(category: ICategory): void {
    const dialogRef = this.dialog.open(SubcategoryFormModalComponent, {
      width: '420px',
      disableClose: true,
      data: {
        categoryId: category.id,
        categoryName: category.name,
        subcategory: null,
      } as SubcategoryFormData,
    });

    dialogRef.afterClosed().subscribe((result: CreateSubcategoryDto | null) => {
      if (result) {
        this.state.createSubcategory(result);
      }
    });
  }

  protected readonly editingSubcategoryId = signal<number | null>(null);
  protected readonly editingSubName = signal('');

  protected startEditingSubName(subcategory: ISubcategory, event: Event): void {
    event.stopPropagation();
    this.editingSubcategoryId.set(subcategory.id);
    this.editingSubName.set(subcategory.name);
    setTimeout(() => {
      const input = this.elementRef.nativeElement.querySelector('#subNameInput') as HTMLInputElement;
      input?.focus();
      input?.select();
    });
  }

  protected saveSubName(category: ICategory, subcategory: ISubcategory): void {
    const newName = this.editingSubName().trim();
    this.editingSubcategoryId.set(null);
    if (newName && newName !== subcategory.name) {
      this.state.updateSubcategory(subcategory.id, category.id, { name: newName });
    }
  }

  protected cancelEditingSub(): void {
    this.editingSubcategoryId.set(null);
  }

  protected onSubNameKeydown(event: KeyboardEvent, category: ICategory, subcategory: ISubcategory): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveSubName(category, subcategory);
    } else if (event.key === 'Escape') {
      this.cancelEditingSub();
    }
  }

  protected deleteSubcategory(category: ICategory, subcategory: ISubcategory): void {
    const dialogRef = this.dialog.open(SubcategoryDeleteModalComponent, {
      width: '650px',
      maxHeight: '85vh',
      disableClose: true,
      data: {
        subcategory,
        category,
        categories: this.categories(),
      } as SubcategoryDeleteData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'deleted') {
        this.state.removeSubcategory(subcategory.id, category.id);
      }
    });
  }

  protected toggleTier(category: ICategory, tier: string): void {
    const current = category.enabledTiers || ['free', 'premium'];
    const updated = current.includes(tier)
      ? current.filter(t => t !== tier)
      : [...current, tier];
    this.state.updateCategoryTiers(category.id, updated);
  }

  protected toggleSubcategoryTier(category: ICategory, subcategory: ISubcategory, tier: string): void {
    const current = subcategory.enabledTiers || ['free', 'premium'];
    const updated = current.includes(tier)
      ? current.filter(t => t !== tier)
      : [...current, tier];
    this.state.updateSubcategoryTiers(subcategory.id, category.id, updated);
  }
}
