import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Component, Input, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ITagSummary } from '@shared/interfaces/tag.model';

@Component({
    selector: 'app-tag-summary-cards',
    imports: [CommonModule, MatIconModule],
    templateUrl: './tag-summary-cards.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagSummaryCardsComponent {
  @Input() tagSummaries: ITagSummary[] = [];
  readonly selectedIds = input<number[]>([]);
  readonly tagClick = output<number>();

  get hasTagsWithExpenses(): boolean {
    return this.tagSummaries?.some(tag => tag.expenseCount > 0) ?? false;
  }

  isSelected(tagId: number): boolean {
    return this.selectedIds()?.includes(tagId) ?? false;
  }

  onTagClick(tagId: number): void {
    this.tagClick.emit(tagId);
  }

  periodLabel(summary: ITagSummary): string | null {
    if (!summary.firstExpenseDate || !summary.lastExpenseDate) {
      return null;
    }
    // parseISO keeps date-only strings in LOCAL time (new Date() would shift a day in UTC-6)
    const from = format(parseISO(summary.firstExpenseDate), 'MMM yyyy', { locale: es });
    const to = format(parseISO(summary.lastExpenseDate), 'MMM yyyy', { locale: es });
    return from === to ? from : `${from} – ${to}`;
  }
}
