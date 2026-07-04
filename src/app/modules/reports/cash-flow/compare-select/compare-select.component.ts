import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ElementRef,
  signal,
  output,
  viewChild
} from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatIconModule } from '@angular/material/icon';
import { ICategory, ISubcategory } from '@shared/interfaces/common.model';
import { toMutedColor } from '@shared/services/maguey-palette';
import { PillComponent } from '@shared/components/pill/pill.component';
import { CompareSelection } from '../../interfaces/cash-flow.model';

interface SelectionPill {
  label: string;
  color: string;
  kind: 'category' | 'subcategory';
  id: number;
}

/**
 * Category/subcategory multi-select for compare mode
 * (flujo-caja-comparar.html): selections render as pills inside the field.
 */
@Component({
    selector: 'app-compare-select',
    templateUrl: './compare-select.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OverlayModule, MatIconModule, PillComponent]
})
export class CompareSelectComponent {
  @Input() categories: ICategory[] = [];
  @Input() selection: CompareSelection = { categoryIds: [], subcategoryIds: [] };
  readonly selectionChange = output<CompareSelection>();

  readonly trigger = viewChild.required<ElementRef<HTMLElement>>('trigger');

  protected readonly open = signal(false);
  protected triggerWidth = 0;

  protected get pills(): SelectionPill[] {
    const categoryPills: SelectionPill[] = this.selection.categoryIds
      .map(id => this.categories.find(category => category.id === id))
      .filter(category => category !== undefined)
      .map(category => ({
        label: category.name,
        color: toMutedColor(category.colorPalette),
        kind: 'category' as const,
        id: category.id,
      }));

    const subcategoryPills: SelectionPill[] = this.selection.subcategoryIds
      .map(id => {
        const parent = this.categories.find(category =>
          (category.subcategories ?? []).some(sub => sub.id === id));
        const sub = parent?.subcategories?.find(item => item.id === id);
        return parent && sub
          ? {
            label: sub.name,
            color: toMutedColor(parent.colorPalette),
            kind: 'subcategory' as const,
            id,
          }
          : null;
      })
      .filter(pill => pill !== null);

    return [...categoryPills, ...subcategoryPills];
  }

  protected toggle(): void {
    this.triggerWidth = this.trigger().nativeElement.getBoundingClientRect().width;
    this.open.update(value => !value);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected isCategorySelected(category: ICategory): boolean {
    return this.selection.categoryIds.includes(category.id);
  }

  protected isSubcategorySelected(sub: ISubcategory): boolean {
    return this.selection.subcategoryIds.includes(sub.id);
  }

  protected mutedColor(color: string | null | undefined): string {
    return toMutedColor(color);
  }

  protected toggleCategory(category: ICategory): void {
    const selected = this.isCategorySelected(category);
    const subcategoryIdsOfCategory = (category.subcategories ?? []).map(sub => sub.id);
    this.emit({
      categoryIds: selected
        ? this.selection.categoryIds.filter(id => id !== category.id)
        : [...this.selection.categoryIds, category.id],
      // Selecting the whole category absorbs its individually-picked subcategories
      subcategoryIds: selected
        ? this.selection.subcategoryIds
        : this.selection.subcategoryIds.filter(id => !subcategoryIdsOfCategory.includes(id)),
    });
  }

  protected toggleSubcategory(category: ICategory, sub: ISubcategory): void {
    if (this.isCategorySelected(category)) {
      return;
    }
    this.emit({
      categoryIds: this.selection.categoryIds,
      subcategoryIds: this.isSubcategorySelected(sub)
        ? this.selection.subcategoryIds.filter(id => id !== sub.id)
        : [...this.selection.subcategoryIds, sub.id],
    });
  }

  protected removePill(pill: SelectionPill, event: Event): void {
    event.stopPropagation();
    this.emit(pill.kind === 'category'
      ? { ...this.selection, categoryIds: this.selection.categoryIds.filter(id => id !== pill.id) }
      : { ...this.selection, subcategoryIds: this.selection.subcategoryIds.filter(id => id !== pill.id) });
  }

  private emit(selection: CompareSelection): void {
    this.selectionChange.emit(selection);
  }
}
