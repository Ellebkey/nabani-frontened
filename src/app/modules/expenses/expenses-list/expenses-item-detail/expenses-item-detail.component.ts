import { Component, Input, ChangeDetectionStrategy, signal, inject, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { IExpense, IExpenseArticles } from '@shared/interfaces/expense.model';
import { ExpensesService } from '@app/modules/expenses/expenses.service';
import { CommonService } from '@shared/services/common.service';
import { MagueyConfirmationService } from '@root/@maguey/services/confirmation';
import { ExpensesCreateModalComponent } from '@app/modules/expenses/expenses-create-modal/expenses-create-modal.component';
import { TransactionRowComponent } from '../../../shared/components/transaction-row/transaction-row.component';
import { DotComponent } from '../../../shared/components/dot/dot.component';
import { MatIcon } from '@angular/material/icon';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';

@Component({
    selector: 'app-expenses-item-detail',
    templateUrl: './expenses-item-detail.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TransactionRowComponent, DotComponent, MatIcon, SkeletonComponent, PillComponent, DecimalPipe, CurrencyPipe, DatePipe]
})

export class ExpensesItemDetailComponent {
  private expenseService = inject(ExpensesService);
  private common = inject(CommonService);
  private magueyConfirmationService = inject(MagueyConfirmationService);
  dialog = inject(MatDialog);


  @Input() expense!: IExpense;
  @Input() categoryColors: Record<string, string> = {};
  readonly reload = output<void>();
  readonly showDetails = signal(false);
  readonly isLoadingDetails = signal(false);

  private readonly paymentIcons: Record<string, string> = {
    credit: 'heroicons_outline:credit-card',
    debit: 'heroicons_outline:credit-card',
    transfer: 'heroicons_outline:arrows-right-left',
    cash: 'heroicons_outline:banknotes',
    wallet: 'heroicons_outline:wallet',
  };

  get paymentIcon(): string {
    return this.paymentIcons[this.expense.method] || 'heroicons_outline:credit-card';
  }

  get paymentLabel(): string {
    const name = this.expense.shortName || '';
    const number = this.expense.cardNumber;
    return number ? `${name} · ${number}` : name;
  }

  articleColor(article: IExpenseArticles): string {
    if (!article.categoryName) {
      return '#5F7386';
    }
    return this.categoryColors[article.categoryName] || '#5F7386';
  }

  articlePillLabel(article: IExpenseArticles): string | undefined {
    return article.subcategoryName
      ? `${article.categoryName} · ${article.subcategoryName}`
      : article.categoryName;
  }

  onDetailsClick() {
    this.showDetails.update(value => !value);

    if (this.showDetails() && !this.expense.articles?.length) {
      this.isLoadingDetails.set(true);
      this.expenseService.getExpenseById(this.expense.id)
        .subscribe({
          next: (expense) => {
            this.expense.articles = expense.articles;
            this.expense.tags = expense.tags;
            this.isLoadingDetails.set(false);
          },
          error: () => {
            this.isLoadingDetails.set(false);
          }
        });
    }
  }

  async deleteExpense(): Promise<void> {
    const dialogData = this.common.getDefaultDeleteConfirmation({
      objectName: 'expense'
    });
    const confirmDialog = this.magueyConfirmationService.open(dialogData);

    confirmDialog.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.expenseService.deleteExpense(this.expense.id).subscribe({
            next: () => {
              this.reload.emit();
            },
            error: (err) => {
              console.error(err);
            }
          }
        );
      }
    });
  }

  createExpenseFromTemplate(): void {
    const dialogRef = this.dialog.open(ExpensesCreateModalComponent, {
      data: { ...this.expense, isTemplate: true },
      width: '1260px',
      height: '94vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      disableClose: true,
    });

    dialogRef.afterClosed()
      .subscribe(result => {
        if (result) {
          this.reload.emit();
        }
      });
  }

  editExpense(): void {
    // First get the full expense details with articles
    this.expenseService.getExpenseById(this.expense.id)
      .subscribe({
        next: (fullExpense) => {
          const dialogRef = this.dialog.open(ExpensesCreateModalComponent, {
            data: fullExpense,
            width: '1260px',
            height: '94vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            disableClose: true,
          });

          dialogRef.afterClosed()
            .subscribe(result => {
              if (result) {
                this.reload.emit();
              }
            });
        },
        error: (err) => {
          console.error('Error loading expense details:', err);
        }
      });
  }
}
