import { Component, OnInit, ChangeDetectionStrategy, signal, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HotToastService } from '@ngxpert/hot-toast';

import { ExpensesService } from '../expenses.service';
import { ArticlesService } from '@app/modules/inventory/articles.service';
import { MerchantsService } from '@app/modules/inventory/merchants.service';
import { CommonService } from '@shared/services/common.service';
import { TagService } from '@shared/services/tag.service';
import { IExpenseDTO, PaymentMethod, IExpenseArticles } from '@shared/interfaces/expense.model';
import { IPaymentMethodCreate } from '@shared/interfaces/payment-method.model';
import { PaymentMethodsApiService } from '@app/modules/admin/payment-methods/services/api/payment-methods-api.service';
import { PaymentMethodFormModalComponent } from '@app/modules/admin/payment-methods/modals/payment-method-form-modal/payment-method-form-modal.component';
import { Category } from '@shared/interfaces/common.model';
import { ArticleRecord } from '@shared/interfaces/article.model';
import { IMerchant } from '@shared/interfaces/merchant.model';
import { ITag } from '@shared/interfaces/tag.model';
import { ArticleListManagerComponent } from '../shared/article-list-manager/article-list-manager.component';
import { NgSelectComponent, NgLabelTemplateDirective, NgOptionTemplateDirective, NgFooterTemplateDirective } from '@ng-select/ng-select';
import { ModalShellComponent } from '../../shared/components/modal-shell/modal-shell.component';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { DotComponent } from '../../shared/components/dot/dot.component';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CurrencyPipe } from '@angular/common';

const currentTimeString = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

// Dialog data articles come either from a saved expense (articleId/articleName)
// or from a raw draft/receipt item (id/concept); amounts may arrive as strings.
interface DialogArticle {
  articleId?: number;
  id?: number;
  articleName?: string;
  concept?: string;
  quantity: number | string;
  units: string;
  price: number | string;
  onDiscount?: boolean;
  categoryId: number;
  subcategoryId: number;
  categoryName?: string;
  subcategoryName?: string;
  subtotal: number | string;
}

@Component({
    selector: 'app-expenses-create-modal',
    templateUrl: './expenses-create-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalShellComponent, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker, NgSelectComponent, NgLabelTemplateDirective, DotComponent, NgOptionTemplateDirective, NgFooterTemplateDirective, MatIcon, MatSlideToggle, ArticleListManagerComponent, MatButton, MatProgressSpinner, CurrencyPipe]
})
export class ExpensesCreateModalComponent implements OnInit {
  private expenseService = inject(ExpensesService);
  private articleService = inject(ArticlesService);
  private merchantService = inject(MerchantsService);
  private commonService = inject(CommonService);
  private tagService = inject(TagService);
  private paymentMethodsApi = inject(PaymentMethodsApiService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private dialogRef = inject<MatDialogRef<ExpensesCreateModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  data = inject(MAT_DIALOG_DATA);


  readonly paymentMethodSelect = viewChild<NgSelectComponent>('paymentMethodSelect');

  // Built in a field initializer so the toSignal bridge below runs in an injection context
  readonly expenseForm: FormGroup = this.fb.group({
    recipientId: [null, Validators.required],
    paymentMethodId: [null, Validators.required],
    expenseDate: [null, Validators.required],
    expenseTime: [currentTimeString(), Validators.required],
    isMonths: [false],
    totalMonths: [null],
    comment: [null],
    tagIds: [[]]
  });

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly formEvents = toSignal(this.expenseForm.events);
  readonly formInvalid = computed(() => { this.formEvents(); return this.expenseForm.invalid; });
  readonly formDisabled = computed(() => { this.formEvents(); return this.expenseForm.disabled; });
  readonly formValue = computed(() => { this.formEvents(); return this.expenseForm.getRawValue(); });

  readonly categories = signal<Category[]>([]);
  readonly articles = signal<ArticleRecord[]>([]);
  readonly payments = signal<PaymentMethod[]>([]);
  readonly merchants = signal<IMerchant[]>([]);
  readonly tags = signal<ITag[]>([]);

  readonly expense = signal<IExpenseDTO>({
    recipientId: '',
    paymentMethodId: '',
    isMonths: false,
    isPayout: true,
    totalMonths: 0,
    remainingMonths: 0,
    debtAmount: 0,
    totalAmount: 0,
    expenseDate: '',
    comment: '',
    articles: [] as IExpenseArticles[]
  });

  readonly costcoMode = signal(false);
  readonly isEditMode = signal(false);
  readonly isEditingArticle = signal(false);
  readonly title = signal('Registrar gasto');

  readonly hasArticlesWithoutCategory = computed(() =>
    this.expense().articles.some(
      article => !article.categoryId || !article.subcategoryId
    )
  );

  ngOnInit(): void {
    this.checkEditMode();
    this.loadInitialData();
    this.setupFormListeners();
    this.initializeFromTemplate();
  }

  private checkEditMode(): void {
    if (this.data && this.data.id && !this.data.isTemplate) {
      this.isEditMode.set(true);
      this.title.set(this.data.isDraft ? 'Completar gasto' : 'Actualizar gasto');
    }
  }

  private loadInitialData(): void {
    forkJoin({
      categories: this.expenseService.getCategoriesForUser(),
      articles: this.articleService.getArticleList({ limit: 10000, fetchAll: 'false' }),
      merchants: this.merchantService.getMerchantsList({ limit: 10000, fetchAll: 'false' }),
      payments: this.expenseService.getPaymentMethods({
        isActive: true
      }),
      tags: this.tagService.getTags({ fetchAll: true })
    }).subscribe({
      next: (response) => {
        this.categories.set((response.categories as any));
        this.articles.set(response.articles.rows);
        this.merchants.set(response.merchants.rows);
        this.payments.set(response.payments);
        this.tags.set(response.tags.rows);
      },
      error: (error) => {
        console.error('Error loading initial data:', error);
      }
    });
  }

  private setupFormListeners(): void {
    this.expenseForm.get('isMonths')?.valueChanges.subscribe(value => {
      const totalMonthsControl = this.expenseForm.get('totalMonths');
      if (totalMonthsControl) {
        if (value) {
          totalMonthsControl.setValidators([Validators.required]);
        } else {
          totalMonthsControl.clearValidators();
        }
        totalMonthsControl.updateValueAndValidity();
      }
    });
  }

  private initializeFromTemplate(): void {
    if (!this.data) {
      return;
    }

    if (this.isEditMode()) {
      // For drafts, don't populate date/time, recipient and payment method so user must select them
      const isDraft = this.data.isDraft;

      // Only parse date/time for non-draft edits
      const expenseDate = isDraft ? null : new Date(this.data.expenseDate);
      const timeString = isDraft ? null : `${new Date(this.data.expenseDate).getHours().toString().padStart(2, '0')}:${new Date(this.data.expenseDate).getMinutes().toString().padStart(2, '0')}`;

      this.expenseForm.patchValue({
        recipientId: isDraft ? null : this.data.recipientId,
        paymentMethodId: isDraft ? null : this.data.paymentMethodId,
        expenseDate: expenseDate,
        expenseTime: timeString,
        isMonths: this.data.isMonths,
        totalMonths: this.data.totalMonths,
        comment: isDraft ? null : this.data.comment,
        tagIds: this.data.tags?.map((t: ITag) => t.id) || []
      });

      // Populate expense model data
      this.expense.update(expense => ({
        ...expense,
        recipientId: isDraft ? '' : this.data.recipientId,
        paymentMethodId: isDraft ? '' : this.data.paymentMethodId,
        isMonths: this.data.isMonths,
        isPayout: this.data.isPayout,
        totalMonths: this.data.totalMonths,
        remainingMonths: this.data.remainingMonths,
        debtAmount: this.data.debtAmount,
        totalAmount: this.data.totalAmount,
        expenseDate: isDraft ? '' : this.data.expenseDate,
        comment: isDraft ? '' : this.data.comment,
      }));
    } else {
      // Clone mode - populate some fields but reset date and amounts
      this.expenseForm.patchValue({
        recipientId: this.data.recipientId,
        paymentMethodId: this.data.paymentMethodId,
        expenseDate: '',
        isMonths: this.data.isMonths,
        totalMonths: null,
        comment: null
      });

      // Restore expense model data for clone
      this.expense.update(expense => ({
        ...expense,
        isPayout: null,
        totalAmount: this.data.totalAmount,
        debtAmount: null,
        remainingMonths: null,
      }));
    }

    // Restore articles (same for both edit and clone)
    const articles: IExpenseArticles[] = this.data.articles.map((article: DialogArticle) => ({
      articleId: (article.articleId || article.id)!,
      articleName: (article.articleName || article.concept)!,
      quantity: Number(article.quantity),
      units: article.units,
      price: Number(article.price),
      onDiscount: article.onDiscount || false,
      categoryId: article.categoryId,
      subcategoryId: article.subcategoryId,
      categoryName: article.categoryName,
      subcategoryName: article.subcategoryName,
      subtotal: Number(article.subtotal)
    }));
    this.expense.update(expense => ({ ...expense, articles }));
  }

  onPaymentSelect(payment: PaymentMethod): void {
    this.expense.update(expense => ({ ...expense, isPayout: payment.method !== 'credit' }));
  }

  onArticlesChange(articles: IExpenseArticles[]): void {
    this.expense.update(expense => ({ ...expense, articles }));
  }

  onTotalAmountChange(totalAmount: number): void {
    this.expense.update(expense => ({ ...expense, totalAmount }));
  }

  onEditingStateChange(isEditing: boolean): void {
    this.isEditingArticle.set(isEditing);
  }

  save(): void {
    if (this.expenseForm.invalid || this.expense().articles.length === 0) {
      return;
    }

    const formValue = this.expenseForm.value;
    const combinedDateTime = this.commonService.combineDateAndTime(formValue.expenseDate, formValue.expenseTime);

    const expenseData: IExpenseDTO = {
      ...this.expense(),
      ...formValue,
      expenseDate: combinedDateTime,
      // When updating, always set isDraft to false to finalize the expense
      isDraft: this.isEditMode() ? false : undefined,
    };

    // Only set initial credit values for new expenses, not during edit
    // During edit, preserve the existing remainingMonths and debtAmount
    if (expenseData.isMonths && !this.isEditMode()) {
      expenseData.remainingMonths = expenseData.totalMonths;
      expenseData.debtAmount = expenseData.totalAmount;
    }

    this.expenseForm.disable();

    const operation = this.isEditMode()
      ? this.expenseService.updateExpense(this.data.id, expenseData as any)
      : this.expenseService.saveExpense(expenseData as any);

    const loadingMessage = this.isEditMode() ? 'Actualizando...' : 'Guardando...';
    const successMessage = this.isEditMode() ? 'Gasto actualizado exitosamente' : 'Gasto guardado exitosamente';
    const errorMessage = this.isEditMode() ? 'Error al actualizar el gasto' : 'Error al guardar el gasto';

    operation
      .pipe(
        this.toast.observe({
          loading: loadingMessage,
          success: successMessage,
          error: errorMessage
        }),
        catchError((error) => {
          console.error(error);
          return of(error);
        })
      )
      .subscribe({
        next: (response) => {
          setTimeout(() => {
            this.dialogRef.close(response);
          }, 500);
        }
      });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  openCreatePaymentMethod(): void {
    this.paymentMethodSelect()?.close();

    const dialogRef = this.dialog.open(PaymentMethodFormModalComponent, {
      data: null,
      maxWidth: '100vw',
    });

    dialogRef.afterClosed().subscribe((result: IPaymentMethodCreate | null) => {
      if (result) {
        this.paymentMethodsApi.createPaymentMethod(result).subscribe({
          next: (newPm) => {
            const pm: PaymentMethod = { id: newPm.id, method: newPm.method, name: newPm.shortName };
            this.payments.update(payments => [...payments, pm]);
            this.expenseForm.patchValue({ paymentMethodId: pm.id });
            this.onPaymentSelect(pm);
            this.toast.success('Método de pago creado exitosamente');
          },
          error: () => this.toast.error('Error al crear el método de pago')
        });
      }
    });
  }

  addMerchantOnTheFly = (name: string) => {
    return this.merchantService.createMerchant({ name: name.trim() } as IMerchant)
      .toPromise()
      .then((newMerchant) => {
        if (!newMerchant) {
          return null;
        }
        this.merchants.update(merchants => [...merchants, newMerchant]);
        this.toast.success(`Beneficiario "${name}" creado`);
        return newMerchant;
      })
      .catch(() => {
        this.toast.error('Error al crear el beneficiario');
        return null;
      });
  };

  addTagOnTheFly = (name: string) => {
    return this.tagService.createTagWithRandomColor(name).toPromise()
      .then((newTag) => {
        if (!newTag) {
          return null;
        }
        this.tags.update(tags => [...tags, newTag]);
        this.toast.success(`Etiqueta "${name}" creada`);
        return newTag;
      })
      .catch((error) => {
        console.error('Error creating tag:', error);
        this.toast.error('Error al crear la etiqueta');
        return null;
      });
  };
}
