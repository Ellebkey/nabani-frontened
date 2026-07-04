import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, signal, computed, DestroyRef, ElementRef, ViewChild } from '@angular/core';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { format, parseISO } from 'date-fns';
import { DateRange, DateRangeFilterComponent } from '@shared/components/date-range-filter/date-range-filter.component';
import { es } from 'date-fns/locale';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { NgSelectModule } from '@ng-select/ng-select';
import { HotToastService } from '@ngxpert/hot-toast';

import { CashFlowService } from './services/cash-flow.service';
import { SankeyChartComponent } from './sankey-chart/sankey-chart.component';
import {
  SankeyData,
  SubCategoryItem,
  SelectedCategory,
  NodeClickEvent,
  ExpenseItemByCategory,
} from '../interfaces/cash-flow.model';
import { CashFlowCompareComponent } from './compare-view/cash-flow-compare.component';
import { toMutedColor } from '@shared/services/maguey-palette';
import { TagService } from '@shared/services/tag.service';
import { CategoriesApiService } from '@app/modules/admin/categories-management/services/api/categories-api.service';
import { ITag, ITagSummary } from '@shared/interfaces/tag.model';
import { ICategory, ISubcategory } from '@shared/interfaces/common.model';
import { PaginationSetting } from '@shared/interfaces/shared.model';
import { TagSummaryCardsComponent } from '@app/modules/expenses/expenses-list/tag-summary-cards/tag-summary-cards.component';
import { PagerComponent, PageEvent } from '@shared/components/pager/pager.component';
import { CompactSelectComponent, MgSelectOption } from '@shared/components/compact-select/compact-select.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { TileComponent } from '@shared/components/tile/tile.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { RowSkeletonComponent } from '@shared/components/skeleton/row-skeleton.component';

@Component({
    selector: 'app-cash-flow',
    templateUrl: './cash-flow.component.html',
    styleUrls: ['./cash-flow.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatSelectModule,
    NgSelectModule,
    FormsModule,
    SankeyChartComponent,
    TagSummaryCardsComponent,
    DateRangeFilterComponent,
    PagerComponent,
    CompactSelectComponent,
    PillComponent,
    TileComponent,
    EmptyStateComponent,
    SkeletonComponent,
    RowSkeletonComponent,
    CashFlowCompareComponent
]
})
export class CashFlowComponent implements OnInit {
  @ViewChild('categoryDetail') categoryDetailEl!: ElementRef;

  // === DEPENDENCIES ===
  private readonly cashFlowService = inject(CashFlowService);
  private readonly tagService = inject(TagService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly toast = inject(HotToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  // === PRIVATE SIGNALS (writable) ===
  private readonly sankeyDataSignal = signal<SankeyData | null>(null);
  private readonly isLoadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly selectedCategorySignal = signal<SelectedCategory | null>(null);
  private readonly subCategoryDataSignal = signal<SubCategoryItem[]>([]);
  private readonly isLoadingSubCategoriesSignal = signal(false);
  private readonly tagsSignal = signal<ITag[]>([]);
  private readonly tagSummariesSignal = signal<ITagSummary[]>([]);
  private readonly selectedSubCategorySignal = signal<SubCategoryItem | null>(null);
  private readonly expenseItemsSignal = signal<ExpenseItemByCategory[]>([]);
  private readonly expenseItemsCountSignal = signal(0);
  private readonly expenseItemsTotalSignal = signal(0);
  private readonly isLoadingExpenseItemsSignal = signal(false);

  // === PUBLIC SIGNALS (readonly) ===
  readonly sankeyData = this.sankeyDataSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly selectedCategory = this.selectedCategorySignal.asReadonly();
  readonly subCategoryData = this.subCategoryDataSignal.asReadonly();
  readonly isLoadingSubCategories = this.isLoadingSubCategoriesSignal.asReadonly();
  readonly tags = this.tagsSignal.asReadonly();
  readonly tagSummaries = this.tagSummariesSignal.asReadonly();
  readonly selectedSubCategory = this.selectedSubCategorySignal.asReadonly();
  readonly expenseItems = this.expenseItemsSignal.asReadonly();
  readonly expenseItemsCount = this.expenseItemsCountSignal.asReadonly();
  readonly expenseItemsTotal = this.expenseItemsTotalSignal.asReadonly();
  readonly isLoadingExpenseItems = this.isLoadingExpenseItemsSignal.asReadonly();

  // Inline edit state
  private readonly categoriesSignal = signal<ICategory[]>([]);
  readonly categories = this.categoriesSignal.asReadonly();
  readonly editingItemKey = signal<string | null>(null);
  readonly editCategoryId = signal<number | null>(null);
  readonly editSubcategoryId = signal<number | null>(null);
  readonly editSubcategories = signal<ISubcategory[]>([]);
  private readonly isSavingCategorySignal = signal(false);
  readonly isSavingCategory = this.isSavingCategorySignal.asReadonly();

  readonly displayedColumns = ['expenseId', 'expenseDate', 'recipientName', 'concept', 'category', 'subtotal'];

  selectedTagName(): string | null {
    const selectedIds = this.selectedTagIds.value || [];
    if (!selectedIds.length) {
      return null;
    }
    return this.tagsSignal().find(tag => tag.id === selectedIds[0])?.name ?? null;
  }

  readonly categoryOptions = computed<MgSelectOption[]>(() => this.categories()
    .map(category => ({ value: category.id, label: category.name, color: category.colorPalette || undefined })));

  readonly editSubcategoryOptions = computed<MgSelectOption[]>(() => this.editSubcategories()
    .map(subcategory => ({ value: subcategory.id, label: subcategory.name })));


  // Selected tag color for Sankey theming (uses first selected tag's color)
  private readonly selectedTagColorSignal = signal<string | null>(null);
  readonly selectedTagColor = this.selectedTagColorSignal.asReadonly();

  startDate = '';
  endDate = '';

  // Cache for pre-fetched subcategory data
  private subCategoryCache = new Map<string, SubCategoryItem[]>();

  selectedTagIds = new FormControl<number[]>([]);

  // Pagination state for expense items
  expenseItemsPagination: PaginationSetting = {
    limit: 10,
    offset: 0,
    count: 0,
    showInputSearch: false,
  };

  ngOnInit(): void {
    this.loadTags();
    this.loadCategories();
    this.loadData();
  }

  private loadCategories(): void {
    this.categoriesApi.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.categoriesSignal.set(categories),
        error: (err) => console.error('Error loading categories:', err),
      });
  }

  private loadTags(): void {
    this.tagService.getTags({ fetchAll: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.tagsSignal.set(response.rows),
        error: (err) => console.error('Error loading tags:', err),
      });
  }

  private loadTagSummaries(): void {
    if (!this.startDate || !this.endDate) return;

    this.tagService.getTagSummaries({
      startDate: this.startDate,
      endDate: this.endDate,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summaries) => this.tagSummariesSignal.set(summaries),
        error: (err) => console.error('Error loading tag summaries:', err),
      });
  }

  loadData(): void {
    if (!this.startDate || !this.endDate) return;

    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);
    this.clearCategorySelection();
    this.subCategoryCache.clear();

    const startDateStr = this.startDate;
    const endDateStr = this.endDate;
    const tagIds = this.selectedTagIds.value?.join(',') || '';

    // Load tag summaries in parallel
    this.loadTagSummaries();

    // Use different endpoint based on whether tags are selected
    // When tags selected: show ALL expenses with those tags (no date filter)
    // When no tags: show expenses by category for the date range
    const request$ = tagIds
      ? this.cashFlowService.getCashFlowSankeyByTags(tagIds)
      : this.cashFlowService.getCashFlowSankey({ startDate: startDateStr, endDate: endDateStr });

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.sankeyDataSignal.set(data);
          this.isLoadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set('Error al cargar los datos del flujo de efectivo');
          this.isLoadingSignal.set(false);
          console.error('Error loading cash flow data:', err);
        },
      });
  }

  onTagFilterChange(): void {
    this.updateSelectedTagColor();
    this.loadData();
  }

  private updateSelectedTagColor(): void {
    const selectedIds = this.selectedTagIds.value || [];
    if (selectedIds.length > 0) {
      const firstSelectedTag = this.tagsSignal().find(tag => tag.id === selectedIds[0]);
      this.selectedTagColorSignal.set(firstSelectedTag ? toMutedColor(firstSelectedTag.color) : null);
    } else {
      this.selectedTagColorSignal.set(null);
    }
  }

  onTagSummaryClick(tagId: number): void {
    const currentTags = this.selectedTagIds.value || [];
    const next = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    this.selectedTagIds.setValue(next);
    this.selectedTagIdsSignal.set(next);
    this.updateSelectedTagColor();
    this.loadData();
  }

  onDateRangeChange(range: DateRange | null): void {
    // No range ("Todo" preset) = full history
    this.startDate = range?.startDate ?? '2000-01-01';
    this.endDate = range?.endDate ?? format(new Date(), 'yyyy-MM-dd');
    this.loadData();
  }

  onCategoryClick(event: NodeClickEvent): void {
    // Only handle category clicks, not the total node
    if (event.type !== 'category') return;

    const categoryName = event.label;
    const nodeId = event.node?.id || `category-${categoryName}`;

    // Find the category node to get its color and categoryId
    const currentData = this.sankeyDataSignal();
    const categoryNode = currentData?.nodes.find(n => n.id === nodeId);
    const numericCategoryId = event.node?.categoryId ?? categoryNode?.categoryId;

    this.selectedCategorySignal.set({
      id: nodeId,
      label: categoryName,
      value: event.value,
      color: event.color,
      categoryId: numericCategoryId,
    });

    this.clearSubCategorySelection();

    if (numericCategoryId != null) {
      this.loadSubCategories(numericCategoryId);
    }

    // Scroll to the subcategory detail panel after change detection renders it
    setTimeout(() => {
      this.categoryDetailEl?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  clearCategorySelection(): void {
    this.selectedCategorySignal.set(null);
    this.subCategoryDataSignal.set([]);
    this.clearSubCategorySelection();
  }

  onSubCategoryClick(subCategory: SubCategoryItem): void {
    this.selectedSubCategorySignal.set(subCategory);
    this.expenseItemsPagination.offset = 0;
    this.cdr.detectChanges();
    this.loadExpenseItems();
  }

  clearSubCategorySelection(): void {
    this.selectedSubCategorySignal.set(null);
    this.expenseItemsSignal.set([]);
    this.expenseItemsCountSignal.set(0);
    this.expenseItemsTotalSignal.set(0);
  }

  onExpenseItemsPaginationChange(event: PageEvent): void {
    this.expenseItemsPagination.limit = event.limit;
    this.expenseItemsPagination.offset = event.offset;
    this.cdr.detectChanges();
    this.loadExpenseItems();
  }

  private loadExpenseItems(): void {
    const categoryId = this.selectedCategorySignal()?.categoryId;
    const subcategoryId = this.selectedSubCategorySignal()?.subcategoryId;

    if (!this.startDate || !this.endDate || !categoryId) return;

    this.isLoadingExpenseItemsSignal.set(true);

    const tagIds = this.selectedTagIds.value?.join(',') || undefined;

    this.cashFlowService.getExpenseItemsByCategory({
      startDate: this.startDate,
      endDate: this.endDate,
      categoryId,
      subcategoryId,
      tagIds,
      limit: this.expenseItemsPagination.limit,
      offset: this.expenseItemsPagination.offset,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.expenseItemsSignal.set(response.rows);
          this.expenseItemsCountSignal.set(response.count);
          this.expenseItemsPagination.count = response.count;
          this.expenseItemsTotalSignal.set(response.total);
          this.isLoadingExpenseItemsSignal.set(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading expense items:', err);
          this.isLoadingExpenseItemsSignal.set(false);
        },
      });
  }

  formatDate(date: string): string {
    return format(new Date(date), 'dd/MM/yyyy');
  }

  formatDateTime(date: string): string {
    return format(new Date(date), "MMM d, yyyy - hh:mmaaa", { locale: es });
  }

  private loadSubCategories(categoryId: number): void {
    const cacheKey = String(categoryId);
    // Check cache first for instant rendering
    const cachedData = this.subCategoryCache.get(cacheKey);
    if (cachedData) {
      this.subCategoryDataSignal.set(cachedData);
      return;
    }

    const tagIds = this.selectedTagIds.value?.join(',') || '';

    // When tags selected, don't need dates
    if (tagIds) {
      this.isLoadingSubCategoriesSignal.set(true);
      this.cashFlowService.getSubCategoriesByCategoryWithTags(categoryId, tagIds)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            this.subCategoryDataSignal.set(response.data);
            this.subCategoryCache.set(cacheKey, response.data);
            this.isLoadingSubCategoriesSignal.set(false);
          },
          error: (err) => {
            console.error('Error loading subcategories:', err);
            this.isLoadingSubCategoriesSignal.set(false);
          },
        });
      return;
    }

    // Fallback to date-based API call
    if (!this.startDate || !this.endDate) return;

    this.isLoadingSubCategoriesSignal.set(true);

    this.cashFlowService.getSubCategoriesByCategory({
      startDate: this.startDate,
      endDate: this.endDate,
      categoryId,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.subCategoryDataSignal.set(response.data);
          this.subCategoryCache.set(cacheKey, response.data);
          this.isLoadingSubCategoriesSignal.set(false);
        },
        error: (err) => {
          console.error('Error loading subcategories:', err);
          this.isLoadingSubCategoriesSignal.set(false);
        },
      });
  }

  itemKey(item: ExpenseItemByCategory): string {
    return `${item.expenseId}-${item.articleId}`;
  }

  startCategoryEdit(item: ExpenseItemByCategory): void {
    const key = this.itemKey(item);
    if (this.editingItemKey() === key) return;

    this.editingItemKey.set(key);
    this.editCategoryId.set(item.categoryId);
    this.editSubcategoryId.set(item.subcategoryId);

    const category = this.categoriesSignal().find(c => c.id === item.categoryId);
    this.editSubcategories.set(category?.subcategories || []);
  }

  cancelCategoryEdit(): void {
    this.editingItemKey.set(null);
    this.editCategoryId.set(null);
    this.editSubcategoryId.set(null);
    this.editSubcategories.set([]);
  }

  onEditCategoryChange(categoryId: number): void {
    this.editCategoryId.set(categoryId);
    this.editSubcategoryId.set(null);

    const category = this.categoriesSignal().find(c => c.id === categoryId);
    this.editSubcategories.set(category?.subcategories || []);
  }

  onEditSubcategoryChange(subcategoryId: number, item: ExpenseItemByCategory): void {
    this.editSubcategoryId.set(subcategoryId);
    const categoryId = this.editCategoryId();
    if (!categoryId || !subcategoryId) return;

    if (categoryId === item.categoryId && subcategoryId === item.subcategoryId) {
      this.cancelCategoryEdit();
      return;
    }

    this.isSavingCategorySignal.set(true);

    this.cashFlowService.updateExpenseItemCategory({
      expenseId: item.expenseId,
      articleId: item.articleId,
      categoryId,
      subcategoryId,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Categoría actualizada');
          this.isSavingCategorySignal.set(false);
          this.cancelCategoryEdit();
          this.reloadSubCategoriesAndItems();
        },
        error: () => {
          this.toast.error('Error al actualizar categoría');
          this.isSavingCategorySignal.set(false);
        },
      });
  }

  private reloadSubCategoriesAndItems(): void {
    const categoryId = this.selectedCategorySignal()?.categoryId;
    if (categoryId != null) {
      this.subCategoryCache.delete(String(categoryId));
      this.loadSubCategories(categoryId);
    }
    this.loadExpenseItems();
  }

  formatCurrency(value: number): string {
    return '$ ' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // === Tag stats (only with an active tag) ===

  private readonly selectedTagIdsSignal = signal<number[]>([]);

  readonly selectedSummaries = computed(() => {
    const ids = this.selectedTagIdsSignal();
    return this.tagSummaries().filter(summary => ids.includes(summary.id));
  });

  readonly tagStatsTotal = computed(() =>
    this.selectedSummaries().reduce((sum, summary) => sum + summary.totalAmount, 0));

  readonly tagStatsCount = computed(() =>
    this.selectedSummaries().reduce((sum, summary) => sum + summary.expenseCount, 0));

  readonly tagStatsPeriod = computed(() => {
    const summaries = this.selectedSummaries().filter(summary => summary.firstExpenseDate);
    if (!summaries.length) {
      return null;
    }
    const first = summaries.map(s => s.firstExpenseDate!).sort()[0];
    const last = summaries.map(s => s.lastExpenseDate!).sort().slice(-1)[0];
    const from = format(parseISO(first), 'MMM yyyy', { locale: es });
    const to = format(parseISO(last), 'MMM yyyy', { locale: es });
    return from === to ? from : `${from} – ${to}`;
  });

  tagPeriodLabel(summary: ITagSummary): string | null {
    if (!summary.firstExpenseDate || !summary.lastExpenseDate) {
      return null;
    }
    const from = format(parseISO(summary.firstExpenseDate), 'MMM yyyy', { locale: es });
    const to = format(parseISO(summary.lastExpenseDate), 'MMM yyyy', { locale: es });
    return from === to ? from : `${from} – ${to}`;
  }

  categoryPercentLabel(value: number): string | null {
    const total = this.sankeyData()?.totalExpenses || 0;
    if (!total) {
      return null;
    }
    const source = this.selectedTagIdsSignal().length ? 'de la etiqueta' : 'del total';
    return `${((value / total) * 100).toFixed(1)}% ${source}`;
  }

  // === Compare mode: lives in app-cash-flow-compare ===

  readonly compareMode = signal(false);

  toggleCompareMode(): void {
    this.compareMode.update(value => !value);
  }
}
