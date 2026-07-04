import { IExpenseArticles } from '@shared/interfaces/expense.model';
import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy, signal, computed, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HotToastService } from '@ngxpert/hot-toast';
import { ArticlesService } from '@app/modules/inventory/articles.service';
import { ArticleRecord, IArticle } from '@shared/interfaces/article.model';
import { Category, ISubcategory, SelectOptions } from '@shared/interfaces/common.model';
import { MgSelectOption } from '@shared/components/compact-select/compact-select.component';
import currency from 'currency.js';
import { NgSelectComponent } from '@ng-select/ng-select';
import { CompactSelectComponent } from '../../../shared/components/compact-select/compact-select.component';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { CurrencyPipe } from '@angular/common';

@Component({
    selector: 'app-article-list-manager',
    templateUrl: './article-list-manager.component.html',
    styleUrls: ['./article-list-manager.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ReactiveFormsModule, NgSelectComponent, CompactSelectComponent, MatButton, MatIcon, MatSlideToggle, MatTooltip, PillComponent, CurrencyPipe]
})
export class ArticleListManagerComponent implements OnInit, OnChanges, OnDestroy {
  private fb = inject(FormBuilder);
  private articleService = inject(ArticlesService);
  private toast = inject(HotToastService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  // Delay/grace windows absorb the synthetic enter/leave events that select
  // overlays and layout shifts replay under the pointer.
  private static readonly HOVER_EDIT_DELAY_MS = 400;
  private static readonly COMMIT_GRACE_MS = 300;
  private static readonly HOVER_SUPPRESS_AFTER_SELECT_MS = 400;

  // Inputs reassigned internally (promise/timer callbacks) are backed by
  // signals so the OnPush template refreshes; the property syntax stays intact.
  private readonly articlesSignal = signal<ArticleRecord[]>([]);
  @Input() set articles(value: ArticleRecord[]) {
    this.articlesSignal.set(value);
  }
  get articles(): ArticleRecord[] {
    return this.articlesSignal();
  }

  @Input() categories: Category[] = [];
  @Input() costcoMode = false;

  private readonly expenseArticlesSignal = signal<IExpenseArticles[]>([]);
  @Input() set expenseArticles(value: IExpenseArticles[]) {
    this.expenseArticlesSignal.set(value);
  }
  get expenseArticles(): IExpenseArticles[] {
    return this.expenseArticlesSignal();
  }

  readonly articlesChange = output<IExpenseArticles[]>();
  readonly totalAmountChange = output<number>();
  readonly editingStateChange = output<boolean>();

  // Built in field initializers so the toSignal bridges below run in an injection context
  readonly articleForm: FormGroup = this.fb.group({
    articleId: [null, Validators.required],
    quantity: [1, Validators.required],
    units: ['pzas', Validators.required],
    price: [null, Validators.required],
    category: [null, Validators.required],
    subcategory: [null, Validators.required],
    onDiscount: [false],
    costcoDiscount: [0],
    costcoIVA: [false]
  });
  readonly editForm: FormGroup = this.fb.group({
    quantity: [null, Validators.required],
    price: [null, Validators.required],
    category: [null, Validators.required],
    subcategory: [null, Validators.required],
    onDiscount: [false]
  });

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly articleFormEvents = toSignal(this.articleForm.events);
  readonly articleFormInvalid = computed(() => { this.articleFormEvents(); return this.articleForm.invalid; });
  private readonly editFormEvents = toSignal(this.editForm.events);
  readonly editFormValue = computed(() => { this.editFormEvents(); return this.editForm.getRawValue(); });

  subcategories: ISubcategory[] = [];
  editSubcategories: ISubcategory[] = [];
  readonly categoryOptions = signal<MgSelectOption[]>([]);
  readonly subcategoryOptions = signal<MgSelectOption[]>([]);
  readonly editSubcategoryOptions = signal<MgSelectOption[]>([]);
  readonly unitOptions = signal<MgSelectOption[]>([]);
  readonly editingIndex = signal<number | null>(null);
  private hoveredIndex: number | null = null;
  private openEditSelects = 0;
  private hoverSuppressed = false;
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private commitTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressTimer: ReturnType<typeof setTimeout> | null = null;

  units: SelectOptions[] = [
    { name: 'pzas', id: 'pzas' },
    { name: 'kg', id: 'kg' },
    { name: 'lt', id: 'lt' }
  ];

  ngOnInit(): void {
    this.setupFormListeners();
    this.unitOptions.set(this.units.map(unit => ({ value: unit.id, label: unit.name })));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories']) {
      this.categoryOptions.set((this.categories ?? []).map(category => ({
        value: category.id,
        label: category.name,
        color: category.colorPalette || undefined,
      })));
    }
  }

  private toSubcategoryOptions(subcategories: ISubcategory[]): MgSelectOption[] {
    return subcategories.map(subcategory => ({ value: subcategory.id, label: subcategory.name }));
  }

  ngOnDestroy(): void {
    this.clearHoverTimer();
    this.cancelPendingCommit();
    if (this.suppressTimer) {
      clearTimeout(this.suppressTimer);
      this.suppressTimer = null;
    }
  }

  private setupFormListeners(): void {
    // Auto-enable discount toggle when costco discount value is entered
    this.articleForm.get('costcoDiscount')?.valueChanges.subscribe(value => {
      if (value > 0 && !this.articleForm.get('onDiscount')?.value) {
        this.articleForm.patchValue({ onDiscount: true });
      }
    });
  }

  addArticleOnTheFly = (concept: string) => {
    return this.articleService.createArticle({ concept: concept.trim() } as IArticle)
      .toPromise()
      .then((newArticle) => {
        this.articles = [...this.articles, newArticle as ArticleRecord];
        this.toast.success(`Artículo "${concept}" creado`);
        return newArticle;
      })
      .catch(() => {
        this.toast.error('Error al crear el artículo');
        return null;
      });
  };

  // Matches mg-compact-select's valueChange type; null clears the match like any unknown id
  onCategorySelect(categoryId: string | number | null): void {
    const category = this.categories.find(cat => cat.id === Number(categoryId));
    this.subcategories = category?.subcategories ?? [];
    this.subcategoryOptions.set(this.toSubcategoryOptions(this.subcategories));
  }

  addArticle(): void {
    if (this.articleForm.invalid) {
      this.articleForm.markAllAsTouched();
      return;
    }

    const formValue = this.articleForm.value;
    const selectedCategory = this.categories.find(cat => cat.id === formValue.category);
    const selectedSubcategory = this.subcategories.find(sub => sub.id === formValue.subcategory);
    if (!selectedCategory || !selectedSubcategory) {
      return;
    }

    const price = this.costcoMode
      ? this.calculateCostcoPrice(formValue.price, formValue.costcoDiscount, formValue.costcoIVA)
      : currency(formValue.price);

    const subtotal = currency(price).multiply(formValue.quantity);

    const newArticle: IExpenseArticles = {
      articleId: formValue.articleId,
      articleName: this.getArticleName(formValue.articleId),
      quantity: formValue.quantity,
      units: formValue.units,
      price: price.value,
      onDiscount: formValue.onDiscount,
      categoryId: selectedCategory.id,
      subcategoryId: selectedSubcategory.id,
      categoryName: selectedCategory.name,
      subcategoryName: selectedSubcategory.name,
      subtotal: subtotal.value
    };

    const updatedArticles = [newArticle, ...this.expenseArticles];
    this.expenseArticles = updatedArticles;
    this.articlesChange.emit(updatedArticles);

    this.calculateAndEmitTotal(updatedArticles);
    this.resetArticleForm();
  }

  deleteArticle(index: number): void {
    const editing = this.editingIndex();
    if (editing === index) {
      this.cancelEdit();
    } else if (editing !== null && editing > index) {
      this.editingIndex.set(editing - 1);
    }

    const updatedArticles = this.expenseArticles.filter((_, i) => i !== index);
    this.expenseArticles = updatedArticles;
    this.articlesChange.emit(updatedArticles);
    this.calculateAndEmitTotal(updatedArticles);
  }

  updateSubtotal(event: Event, index: number): void {
    const value = (event.target as HTMLInputElement).value;
    this.expenseArticles[index].subtotal = Number(value);
    this.articlesChange.emit(this.expenseArticles);
    this.calculateAndEmitTotal(this.expenseArticles);
  }

  // Getter, not computed: updateSubtotal/saveEdit mutate items in place without
  // replacing the array, so a computed would cache a stale total.
  get articlesTotal(): number {
    return this.expenseArticles.reduce((sum, item) => sum + item.subtotal, 0);
  }

  private calculateAndEmitTotal(articles: IExpenseArticles[]): void {
    const total = articles.reduce((sum, item) => sum + item.subtotal, 0);
    this.totalAmountChange.emit(total);
  }

  private calculateCostcoPrice(price: number, discount: number, iva: boolean): currency {
    const subtotal = currency(price).subtract(discount);
    const afterTaxes = iva ? currency(subtotal).multiply(1.16) : subtotal;
    return currency(afterTaxes).divide(1.023);
  }

  private getArticleName(id: number): string {
    return this.articles.find(article => article.id === id)?.concept || '';
  }

  private resetArticleForm(): void {
    const currentCategory = this.articleForm.get('category')?.value;
    const currentSubcategory = this.articleForm.get('subcategory')?.value;

    this.articleForm.reset({
      articleId: null,
      quantity: 1,
      units: 'pzas',
      price: null,
      category: currentCategory,
      subcategory: currentSubcategory,
      onDiscount: false,
      costcoDiscount: 0,
      costcoIVA: false
    });
    this.articleForm.markAsPristine();
    this.articleForm.markAsUntouched();
  }

  onRowMouseEnter(index: number): void {
    this.hoveredIndex = index;
    if (this.openEditSelects > 0 || this.hoverSuppressed) {
      return;
    }
    if (this.editingIndex() === index) {
      this.cancelPendingCommit();
      return;
    }
    this.scheduleStartEdit(index);
  }

  onRowMouseLeave(): void {
    this.hoveredIndex = null;
    this.clearHoverTimer();
    // An open select overlay steals the pointer; that "leave" must not commit.
    if (this.editingIndex() === null || this.openEditSelects > 0 || this.hoverSuppressed) {
      return;
    }
    this.scheduleCommit();
  }

  onEditSelectOpened(opened: boolean): void {
    this.openEditSelects = Math.max(0, this.openEditSelects + (opened ? 1 : -1));
    if (opened) {
      this.cancelPendingCommit();
      this.clearHoverTimer();
    } else if (this.openEditSelects === 0) {
      // Picking an option must not commit this row or start editing the row under the panel.
      this.suppressHover();
    }
  }

  private scheduleStartEdit(index: number): void {
    this.clearHoverTimer();
    this.hoverTimer = setTimeout(() => {
      this.hoverTimer = null;
      if (this.hoveredIndex !== index || this.editingIndex() === index) {
        return;
      }
      if (this.openEditSelects > 0 || this.hoverSuppressed) {
        return;
      }
      if (this.editingIndex() !== null) {
        this.commitEdit(true);
      }
      this.startEdit(index);
    }, ArticleListManagerComponent.HOVER_EDIT_DELAY_MS);
  }

  private scheduleCommit(): void {
    this.cancelPendingCommit();
    const editingAtSchedule = this.editingIndex();
    this.commitTimer = setTimeout(() => {
      this.commitTimer = null;
      if (this.editingIndex() === null || this.editingIndex() !== editingAtSchedule) {
        return;
      }
      if (this.hoveredIndex === this.editingIndex() || this.openEditSelects > 0) {
        return;
      }
      if (this.editFieldFocused()) {
        this.scheduleCommit();
        return;
      }
      this.commitEdit();
    }, ArticleListManagerComponent.COMMIT_GRACE_MS);
  }

  private suppressHover(): void {
    this.hoverSuppressed = true;
    if (this.suppressTimer) {
      clearTimeout(this.suppressTimer);
    }
    this.suppressTimer = setTimeout(() => {
      this.suppressTimer = null;
      this.hoverSuppressed = false;
    }, ArticleListManagerComponent.HOVER_SUPPRESS_AFTER_SELECT_MS);
  }

  private clearHoverTimer(): void {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }

  private cancelPendingCommit(): void {
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
  }

  private editFieldFocused(): boolean {
    const active = document.activeElement;
    return !!active
      && this.host.nativeElement.contains(active)
      && active.closest('.article-table') !== null;
  }

  clickEdit(index: number): void {
    if (this.editingIndex() === index) {
      return;
    }
    this.clearHoverTimer();
    if (this.editingIndex() !== null) {
      this.commitEdit(true);
    }
    this.startEdit(index);
  }

  toggleEditDiscount(): void {
    const control = this.editForm.get('onDiscount');
    control?.setValue(!control.value);
  }

  startEdit(index: number): void {
    this.editingIndex.set(index);
    this.editingStateChange.emit(true);
    const item = this.expenseArticles[index];

    const category = this.categories.find(cat => cat.id === item.categoryId);
    this.editSubcategories = category?.subcategories ?? [];
    this.editSubcategoryOptions.set(this.toSubcategoryOptions(this.editSubcategories));

    const subcategory = this.editSubcategories.find(sc => sc.id === item.subcategoryId);

    this.editForm.patchValue({
      quantity: item.quantity,
      price: item.price,
      category: category?.id ?? null,
      subcategory: subcategory?.id ?? null,
      onDiscount: item.onDiscount
    });
  }

  // An invalid edit stays in edit mode so the user can finish it; only
  // switching to another row (discardInvalid) reverts it.
  private commitEdit(discardInvalid = false): void {
    if (this.editForm.valid) {
      this.saveEdit();
    } else if (discardInvalid) {
      this.cancelEdit();
    }
  }

  saveEdit(): void {
    const editingIndex = this.editingIndex();
    if (this.editForm.invalid || editingIndex === null) {
      return;
    }

    const formValue = this.editForm.value;
    const selectedCategory = this.categories.find(cat => cat.id === formValue.category);
    const selectedSubcategory = this.editSubcategories.find(sub => sub.id === formValue.subcategory);
    if (!selectedCategory || !selectedSubcategory) {
      return;
    }
    const updatedItem = this.expenseArticles[editingIndex];

    const quantityChanged = updatedItem.quantity !== formValue.quantity;
    const priceChanged = updatedItem.price !== formValue.price;

    updatedItem.quantity = formValue.quantity;
    updatedItem.price = formValue.price;
    updatedItem.categoryId = selectedCategory.id;
    updatedItem.subcategoryId = selectedSubcategory.id;
    updatedItem.categoryName = selectedCategory.name;
    updatedItem.subcategoryName = selectedSubcategory.name;
    updatedItem.onDiscount = formValue.onDiscount;

    if (quantityChanged || priceChanged) {
      const subtotal = currency(formValue.price).multiply(formValue.quantity);
      updatedItem.subtotal = subtotal.value;
    }

    this.articlesChange.emit(this.expenseArticles);
    this.calculateAndEmitTotal(this.expenseArticles);

    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingIndex.set(null);
    this.openEditSelects = 0;
    this.cancelPendingCommit();
    this.editingStateChange.emit(false);
    this.editForm.reset();
  }

  getCategoryColor(categoryId: number): string | null {
    return this.categories.find(c => c.id === categoryId)?.colorPalette || null;
  }

  // Matches mg-compact-select's valueChange type; null clears the match like any unknown id
  onEditCategorySelect(categoryId: string | number | null): void {
    const category = this.categories.find(cat => cat.id === Number(categoryId));
    this.editSubcategories = category?.subcategories ?? [];
    this.editSubcategoryOptions.set(this.toSubcategoryOptions(this.editSubcategories));
    this.editForm.patchValue({ subcategory: null });
  }
}
