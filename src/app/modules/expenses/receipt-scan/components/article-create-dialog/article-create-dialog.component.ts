import { formatBarcode } from '@shared/services/barcode';
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ICategory } from '@shared/interfaces/common.model';
import { CompactSelectComponent, MgSelectOption } from '@shared/components/compact-select/compact-select.component';
import { toMutedColor } from '@shared/services/maguey-palette';

export interface ArticleCreateDialogData {
  ocrText: string;
  barcode: string | null;
  categories: ICategory[];
  categoryId?: number | null;
  subcategoryId?: number | null;
}

export interface ArticleCreateDialogResult {
  concept: string;
  categoryId: number | null;
  subcategoryId: number | null;
  learnCode: boolean;
}

/**
 * Create article from Revisar Recibo (modal-buscar-crear.html): the name is
 * editable, prefilled with the receipt text; it links to the row on save.
 */
@Component({
    selector: 'app-article-create-dialog',
    templateUrl: './article-create-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, CompactSelectComponent]
})
export class ArticleCreateDialogComponent {
  private dialogRef = inject<MatDialogRef<ArticleCreateDialogComponent>>(MatDialogRef);
  data = inject<ArticleCreateDialogData>(MAT_DIALOG_DATA);

  concept: string;
  categoryId: number | null;
  subcategoryId: number | null;
  learnCode: boolean;

  readonly touched = signal(false);

  constructor() {
    const data = this.data;

    this.concept = this.titleCase(data.ocrText);
    this.categoryId = data.categoryId ?? null;
    this.subcategoryId = data.subcategoryId ?? null;
    this.learnCode = !!data.barcode;
  }

  get categoryOptions(): MgSelectOption[] {
    return this.data.categories.map(category => ({
      value: category.id,
      label: category.name,
      color: toMutedColor(category.colorPalette),
    }));
  }

  get subcategoryOptions(): MgSelectOption[] {
    const category = this.data.categories.find(item => item.id === this.categoryId);
    return (category?.subcategories ?? []).map(sub => ({ value: sub.id, label: sub.name }));
  }

  get formattedBarcode(): string {
    return formatBarcode(this.data.barcode);
  }

  get canSave(): boolean {
    return this.concept.trim().length > 0 && this.categoryId !== null && this.subcategoryId !== null;
  }

  onCategoryChange(categoryId: number | null): void {
    this.categoryId = categoryId;
    this.subcategoryId = null;
  }

  useAsIs(): void {
    this.concept = this.data.ocrText;
  }

  save(): void {
    this.touched.set(true);
    if (!this.canSave) {
      return;
    }
    const result: ArticleCreateDialogResult = {
      concept: this.concept.trim(),
      categoryId: this.categoryId,
      subcategoryId: this.subcategoryId,
      learnCode: this.learnCode && !!this.data.barcode,
    };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  private titleCase(text: string): string {
    return text.toLowerCase().replace(/(^|\s)\p{L}/gu, (char) => char.toUpperCase());
  }
}
