import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ArticlesService } from '@app/modules/inventory/articles.service';
import { IArticle } from '@shared/interfaces/article.model';
import { FuzzyMatchResult } from '../../models/receipt-scan.model';
import { PillComponent } from '@shared/components/pill/pill.component';
import { toMutedColor } from '@shared/services/maguey-palette';

export interface ArticleSearchDialogData {
  contextName?: string;
}

/** Sentinel result: the user asked to create a new article. */
export interface ArticleSearchCreateNew {
  createNew: true;
}

@Component({
    selector: 'app-article-search-dialog',
    templateUrl: './article-search-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        PillComponent,
    ]
})
export class ArticleSearchDialogComponent {
  data = inject<ArticleSearchDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  private readonly dialogRef = inject(MatDialogRef<ArticleSearchDialogComponent>);
  private readonly articlesService = inject(ArticlesService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly searchText = signal('');
  protected readonly results = signal<IArticle[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly highlightedIndex = signal(0);

  protected get contextName(): string | null {
    return this.data?.contextName ?? null;
  }

  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => {
        if (!term || term.length < 2) {
          this.hasSearched.set(false);
          return of({ rows: [] });
        }
        this.isLoading.set(true);
        return this.articlesService.getArticleList({
          searchText: term,
          limit: 20,
          offset: 0,
          withMeta: true,
        }).pipe(
          catchError(() => of({ rows: [] }))
        );
      }),
      takeUntilDestroyed()
    ).subscribe((response) => {
      this.results.set(response.rows || []);
      this.highlightedIndex.set(0);
      this.isLoading.set(false);
      this.hasSearched.set(true);
    });
  }


  protected moveHighlight(delta: number): void {
    const total = this.results().length;
    if (!total) return;
    this.highlightedIndex.update(index => (index + delta + total) % total);
  }

  protected selectHighlighted(): void {
    const article = this.results()[this.highlightedIndex()];
    if (article) {
      this.selectArticle(article);
    }
  }

  protected createNew(): void {
    this.dialogRef.close({ createNew: true });
  }

  protected mutedColor(color: string | null | undefined): string {
    return toMutedColor(color);
  }

  /** Highlights the search term inside the concept (brand + bold, per the handoff). */
  protected highlightMatch(concept: string): SafeHtml {
    const term = this.searchText().trim();
    if (!term) {
      return concept;
    }
    const htmlEscapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    const escaped = concept.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
    const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const html = escaped.replace(new RegExp(`(${pattern})`, 'ig'),
      '<mark class="bg-transparent font-bold text-brand">$1</mark>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.searchSubject.next(value);
  }

  selectArticle(article: IArticle): void {
    const result: FuzzyMatchResult = {
      articleId: article.id,
      concept: article.concept,
      brand: null,
      barcode: null,
      score: 0,
      matchedOn: 'concept',
    };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
