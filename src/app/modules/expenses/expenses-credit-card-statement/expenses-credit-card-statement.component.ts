import { Component, OnInit, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { catchError, forkJoin, of, tap, delay } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';
import { MatDialog } from '@angular/material/dialog';
import currency from 'currency.js';

import { ExpensesService } from '@app/modules/expenses/expenses.service';
import { AccountsService } from '@app/modules/accounts/accounts.service';
import { CreditCard, PaymentDataDTO, CreditCardDetails, ExpenseCreditRecord } from '@shared/interfaces/expense.model';
import { CommonService } from '@shared/services/common.service';
import { IAccount } from '@shared/interfaces/account.model';
import { ExpensesCreateModalComponent } from '../expenses-create-modal/expenses-create-modal.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { NgSelectComponent, NgLabelTemplateDirective, NgOptionTemplateDirective } from '@ng-select/ng-select';
import { DotComponent } from '../../shared/components/dot/dot.component';
import { MatFormField, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RowSkeletonComponent } from '../../shared/components/skeleton/row-skeleton.component';
import { CcardComponent } from '../../shared/components/ccard/ccard.component';
import { PillComponent } from '../../shared/components/pill/pill.component';
import { MatTooltip } from '@angular/material/tooltip';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
    selector: 'app-expenses-credit-card-statement',
    templateUrl: './expenses-credit-card-statement.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EmptyStateComponent, FormsModule, ReactiveFormsModule, NgSelectComponent, NgLabelTemplateDirective, DotComponent, NgOptionTemplateDirective, MatFormField, MatInput, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker, MatButton, MatIcon, RowSkeletonComponent, CcardComponent, PillComponent, MatTooltip, CurrencyPipe, DatePipe]
})
export class ExpensesCreditCardStatementComponent implements OnInit {
  private expensesService = inject(ExpensesService);
  private accountsService = inject(AccountsService);
  private commonService = inject(CommonService);
  private fb = inject(FormBuilder);
  private toast = inject(HotToastService);
  dialog = inject(MatDialog);


  displayedColumns = ['id', 'expenseDate', 'concept', 'total', 'actions'];
  readonly creditCardsList = signal<CreditCard[]>([]);
  readonly statementRecords = signal<ExpenseCreditRecord[]>([]);
  readonly reviewedStatementRecords = signal<ExpenseCreditRecord[]>([]);
  readonly creditCard = signal<CreditCardDetails | null>(null);

  readonly pendingSum = computed(() =>
    this.statementRecords().reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)
  );

  readonly reviewedSum = computed(() =>
    this.reviewedStatementRecords().reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)
  );
  // Built in a field initializer so the toSignal bridge below runs in an injection context
  readonly searchForm: FormGroup = this.fb.group({
    creditCard: [null, Validators.required],
    dateLimit: [null, Validators.required],
  });

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly searchFormEvents = toSignal(this.searchForm.events);
  readonly searchFormInvalid = computed(() => { this.searchFormEvents(); return this.searchForm.invalid; });
  readonly searchFormValue = computed(() => { this.searchFormEvents(); return this.searchForm.getRawValue(); });

  readonly totalReviewedAmount = signal(0);
  readonly isDataLoading = signal(false);
  readonly isInitialDataLoaded = signal(false);
  readonly accounts = signal<IAccount[]>([]);
  readonly isUpdatingAccount = signal(false);

  readonly paymentDate = signal<Date>(new Date());
  readonly paymentTime = signal<string>('');
  maxPaymentDate: Date = new Date();

  ngOnInit() {
    this.loadData();

    // Initialize payment time to current time
    const now = new Date();
    this.paymentTime.set(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
  }

  loadData() {
    forkJoin([
      this.expensesService.getCreditCards(),
      this.accountsService.getAccounts()
    ]).subscribe({
      next: ([creditCards, accounts]) => {
        this.creditCardsList.set(creditCards);
        this.accounts.set(accounts.rows);
        this.isInitialDataLoaded.set(true);
      }
    });
  }

  onSearch() {
    this.isDataLoading.set(true);
    this.statementRecords.set([]);
    this.reviewedStatementRecords.set([]);
    this.creditCard.set(null);
    this.totalReviewedAmount.set(0);

    const { creditCard, dateLimit } = this.searchForm.value;

    forkJoin([
      this.expensesService.getCreditCardStatement({
        expenseDate: dateLimit,
        paymentMethodId: creditCard
      }).pipe(delay(1000)),
      this.expensesService.getCreditDebt(creditCard)
    ]).pipe(
      tap(([expensesInfo, creditCardInfo]) => {
        this.statementRecords.set([...expensesInfo.regularExpenses, ...expensesInfo.creditExpenses]);
        this.creditCard.set(creditCardInfo);
        this.isDataLoading.set(false);
      })
    ).subscribe({
      error: (err) => {
        console.error(err);
      }
    });
  }

  moveToReviewed(expense: ExpenseCreditRecord) {
    this.statementRecords.update(records => records.filter(item => item.id !== expense.id));
    this.reviewedStatementRecords.update(records => [...records, expense]);
    this.calculateTotals();
  }

  moveBackToStatement(expense: ExpenseCreditRecord) {
    this.reviewedStatementRecords.update(records => records.filter(item => item.id !== expense.id));
    this.statementRecords.update(records => [...records, expense]);
    this.calculateTotals();
  }

  moveAllToReviewed() {
    this.reviewedStatementRecords.update(records => [...records, ...this.statementRecords()]);
    this.statementRecords.set([]);
    this.calculateTotals();
  }

  moveAllForReview() {
    this.statementRecords.update(records => [...records, ...this.reviewedStatementRecords()]);
    this.reviewedStatementRecords.set([]);
    this.calculateTotals();
  }

  calculateTotals() {
    this.totalReviewedAmount.set(this.reviewedStatementRecords().reduce((sum, record) => {
      const amount = record.isMonths ? record.calculateAmount : record.totalAmount;
      return currency(sum).add(amount).value;
    }, 0));
  }

  processSelectedPayments() {
    if (this.reviewedStatementRecords().length === 0) {
      return;
    }

    const formattedPaymentDate = this.paymentDate() && this.paymentTime() ?
      this.commonService.combineDateAndTime(this.paymentDate(), this.paymentTime()) :
      undefined;

    const creditCard = this.creditCard();
    if (!creditCard?.account) {
      return;
    }

    const paymentData: PaymentDataDTO = {
      paymentMethodName: creditCard.name,
      paymentMethodId: creditCard.id,
      accountId: creditCard.account.id,
      totalAmount: this.totalReviewedAmount(),
      regularExpenses: [],
      creditExpenses: [],
      paymentDate: formattedPaymentDate as any
    };

    this.reviewedStatementRecords().forEach(record => {
      if (record.isMonths) {
        paymentData.creditExpenses.push({
          ...record,
          isPayout: record.remainingMonths === 1,
          remainingMonths: record.remainingMonths - 1,
          debtAmount: currency(record.debtAmount).subtract(record.calculateAmount).value,
        });
      } else {
        paymentData.regularExpenses.push(+record.id);
      }
    });

    this.expensesService.createCreditCardStatement(paymentData).pipe(
      this.toast.observe({
        loading: 'Procesando...',
        success: 'Estado de cuenta guardado exitosamente',
        error: 'Error al guardar el estado de cuenta'
      }),
      catchError((error) => {
        console.error(error);
        return of(error);
      })
    ).subscribe({
      next: () => {
        this.reviewedStatementRecords.set([]);
        this.totalReviewedAmount.set(0);
        this.onSearch();
      },
    });
  }

  editExpense(expense: ExpenseCreditRecord): void {
    if (!expense.id) {
      return;
    }

    this.expensesService.getExpenseById(expense.id).subscribe({
      next: (expenseData) => {
        const dialogRef = this.dialog.open(ExpensesCreateModalComponent, {
          disableClose: true,
          data: { ...expenseData, isEditMode: true }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            // Get updated expense data and update the single row
            this.expensesService.getExpenseById(expense.id).subscribe({
              next: (updatedExpenseData) => {
                this.updateSingleExpenseInArrays(expense.id, updatedExpenseData);
                this.toast.success('Gasto actualizado exitosamente');
              },
              error: (error) => {
                console.error('Error fetching updated expense:', error);
                this.toast.error('Error al actualizar los datos');
              }
            });
          }
        });
      },
      error: (error) => {
        console.error('Error fetching expense details:', error);
        this.toast.error('Error al cargar los detalles del gasto');
      }
    });
  }

  private updateSingleExpenseInArrays(expenseId: number, updatedExpenseData: any): void {
    // Convert the full expense data to the format used in credit card statement
    const updatedStatementRecord = {
      id: updatedExpenseData.id,
      expenseDate: updatedExpenseData.expenseDate,
      totalAmount: updatedExpenseData.totalAmount.toString(),
      recipientName: updatedExpenseData.recipientName,
      isMonths: updatedExpenseData.isMonths,
      isPayout: updatedExpenseData.isPayout,
      calculateAmount: updatedExpenseData.calculateAmount || 0,
      remainingMonths: updatedExpenseData.remainingMonths || 0,
      totalMonths: updatedExpenseData.totalMonths || 0,
      debtAmount: updatedExpenseData.debtAmount || 0
    };

    // Update in statementRecords array
    const statementIndex = this.statementRecords().findIndex(item => item.id === expenseId);
    if (statementIndex !== -1) {
      this.statementRecords.update(records =>
        records.map((item, index) => index === statementIndex ? { ...item, ...updatedStatementRecord } : item)
      );
    }

    // Update in reviewedStatementRecords array
    const reviewedIndex = this.reviewedStatementRecords().findIndex(item => item.id === expenseId);
    if (reviewedIndex !== -1) {
      this.reviewedStatementRecords.update(records =>
        records.map((item, index) => index === reviewedIndex ? { ...item, ...updatedStatementRecord } : item)
      );
      // Recalculate totals since reviewed amounts might have changed
      this.calculateTotals();
    }
  }

  updateCreditCardAccount(newAccountId: string): void {
    const currentAccountId = this.creditCard()?.account?.id;
    if (!currentAccountId || newAccountId === currentAccountId) {
      return;
    }

    this.isUpdatingAccount.set(true);
    const selectedCreditCardId = this.searchForm.value.creditCard;

    // Create the update payload
    const updatePayload = {
      accountId: newAccountId
    };

    // Make HTTP request to update payment method
    this.expensesService.updatePaymentMethod(selectedCreditCardId, updatePayload).pipe(
      this.toast.observe({
        loading: 'Actualizando cuenta de tarjeta...',
        success: 'Cuenta actualizada exitosamente',
        error: 'Error al actualizar la cuenta'
      }),
      catchError((error) => {
        console.error('Error updating payment method account:', error);
        return of(error);
      })
    ).subscribe({
      next: (response) => {
        if (response && !response.error) {
          // Update the local credit card data
          const newAccount = this.accounts().find(acc => acc.id === newAccountId);
          if (newAccount) {
            this.creditCard.update(creditCard => (creditCard ? { ...creditCard, account: newAccount } : creditCard));
          }
        }
        this.isUpdatingAccount.set(false);
      },
      error: () => {
        this.isUpdatingAccount.set(false);
      }
    });
  }
}
