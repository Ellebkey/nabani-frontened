import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CompactSelectComponent, MgSelectOption } from '../compact-select/compact-select.component';

export interface PageEvent {
  limit: number;
  offset: number;
}

@Component({
    selector: 'mg-pager',
    templateUrl: './pager.component.html',
    styleUrl: './pager.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, FormsModule, MatIconModule, CompactSelectComponent],
    host: {
        class: 'flex items-center gap-1',
    }
})
export class PagerComponent {
  readonly limit = input(25);
  readonly offset = input(0);
  readonly count = input(0);
  readonly pageSizeOptions = input<number[]>([10, 25, 50, 100]);
  readonly pageChange = output<PageEvent>();

  protected get sizeOptions(): MgSelectOption[] {
    const pageSizeOptions = this.pageSizeOptions();
    const limit = this.limit();
    const sizes = pageSizeOptions.includes(limit)
      ? pageSizeOptions
      : [...pageSizeOptions, limit].sort((a, b) => a - b);
    return sizes.map(size => ({ value: size, label: `${size}` }));
  }

  protected onLimitChange(limit: number): void {
    if (limit === this.limit()) {
      return;
    }
    this.pageChange.emit({ limit, offset: 0 });
  }

  protected get totalPages(): number {
    return Math.max(1, Math.ceil(this.count() / this.limit()));
  }

  protected get currentPage(): number {
    return Math.floor(this.offset() / this.limit()) + 1;
  }

  protected get pages(): number[] {
    const total = this.totalPages;
    const start = Math.min(Math.max(this.currentPage - 2, 1), Math.max(total - 4, 1));
    const end = Math.min(start + 4, total);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  protected get rangeStart(): number {
    return this.count() === 0 ? 0 : this.offset() + 1;
  }

  protected get rangeEnd(): number {
    return Math.min(this.offset() + this.limit(), this.count());
  }

  protected goTo(page: number): void {
    const clamped = Math.min(Math.max(page, 1), this.totalPages);
    if (clamped === this.currentPage) {
      return;
    }
    this.pageChange.emit({ limit: this.limit(), offset: (clamped - 1) * this.limit() });
  }
}
