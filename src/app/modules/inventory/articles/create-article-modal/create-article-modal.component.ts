import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { catchError, of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';
import { ArticlesService } from '@app/modules/inventory/articles.service';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

interface PriceHistoryItem {
  date: string;
  price: number;
  percentageChange?: number;
  isIncrease?: boolean;
}

@Component({
    selector: 'app-create-article-modal',
    templateUrl: './create-article-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalShellComponent, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, PillComponent, MatButton, MatProgressSpinner]
})

export class CreateArticleModalComponent implements OnInit {
  private articleService = inject(ArticlesService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<CreateArticleModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  data = inject(MAT_DIALOG_DATA);


  createArticleForm: FormGroup = this.fb.group({
    concept: [null, Validators.required]
  });
  readonly title = signal('Registrar artículo');
  readonly priceHistory = signal<PriceHistoryItem[]>([]);
  readonly latestPrice = signal(0);
  readonly showPriceHistory = signal(false);

  ngOnInit() {
    if (!this.data) {
      return
    }

    this.title.set('Actualizar artículo');
    this.createArticleForm.patchValue({
      concept: this.data.concept
    });
    this.articleService.getArticleById(this.data.id).subscribe({
      next: (article) => {
        if (article.records && article.records.length > 0) {
          this.processPriceHistory(article.records);
          this.showPriceHistory.set(true);
          if (article.lastPrice) {
            this.latestPrice.set(parseFloat(article.lastPrice));
          }
        }
      }
    });
  }

  save() {
    if (this.createArticleForm.invalid) {
      return;
    }

    this.createArticleForm.disable();

    if (this.data) {
      this.articleService.updateArticle(this.data.id, this.createArticleForm.value)
        .pipe(
          this.toast.observe({
            loading: 'Actualizando...',
            success: 'Artículo actualizado exitosamente',
            error: 'Error al actualizar el articulo'
          }),
          catchError((err) => {
            console.error(err);
            return of(err);
          })
        )
        .subscribe({
            next: (response) => {
              setTimeout(() => {
                this.dialogRef.close(response);
              }, 500);
            },
          }
        );
    } else {
      this.articleService.createArticle(this.createArticleForm.value)
        .pipe(
          this.toast.observe({
            loading: 'Guardando...',
            success: 'Artículo creado exitosamente',
            error: 'Error al guardar el articulo'
          }),
          catchError((err) => {
            console.error(err);
            return of(err);
          })
        )
        .subscribe({
            next: (response) => {
              setTimeout(() => {
                this.dialogRef.close(response);
              }, 500);
            },
          }
        );
    }


  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  processPriceHistory(records: any[]) {
    // Sort records by date descending (newest first)
    const sortedRecords = [...records].sort((a, b) =>
      new Date(b.daySeen).getTime() - new Date(a.daySeen).getTime()
    );

    // Group records by date and get the first price for each date
    const pricesByDate = new Map<string, number>();
    sortedRecords.forEach(record => {
      const dateKey = record.daySeen;
      if (!pricesByDate.has(dateKey)) {
        pricesByDate.set(dateKey, parseFloat(record.price));
      }
    });

    // Convert to array and process price history
    const priceData: PriceHistoryItem[] = [];
    const dates = Array.from(pricesByDate.keys());

    dates.forEach((dateKey, index) => {
      const date = new Date(dateKey);
      const price = pricesByDate.get(dateKey)!;

      let percentageChange: number | undefined;
      let isIncrease: boolean | undefined;

      // Calculate percentage change from previous date
      if (index < dates.length - 1) {
        const previousPrice = pricesByDate.get(dates[index + 1])!;
        percentageChange = ((price - previousPrice) / previousPrice) * 100;
        isIncrease = percentageChange > 0;
      }

      priceData.push({
        date: format(date, 'd MMM y', { locale: es }),
        price: price,
        percentageChange: percentageChange,
        isIncrease: isIncrease
      });
    });

    this.priceHistory.set(priceData);
  }

  formatPrice(price: number): string {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatPercentage(percentage: number | undefined): string {
    if (percentage === undefined) return '';
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  }

}
