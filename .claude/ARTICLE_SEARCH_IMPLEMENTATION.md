# Article Search Implementation Guide

## Overview
Implement a hybrid article search approach that combines backend search with intelligent client-side fallbacks for the expense creation modal.

## Current State
- Loading 10,000 articles upfront in `expenses-create-modal.component.ts:92`
- Using ng-select with virtual scroll
- Backend already supports search via `searchText` parameter

## Implementation Plan

### Phase 1: Backend Search Service Enhancement

#### 1.1 Update Article Service (`articles.service.ts`)
```typescript
// Add these methods to ArticlesService

searchArticles(searchText: string, limit: number = 20): Observable<RecordsList<IArticle>> {
  const query: Query = {
    searchText,
    limit,
    offset: 0
  };
  return this.getArticleList(query);
}

getTopArticles(limit: number = 200): Observable<RecordsList<IArticle>> {
  const query: Query = {
    limit,
    offset: 0,
    fetchAll: 'false'
  };
  return this.getArticleList(query);
}

// Cache management methods
private readonly CACHE_KEY = 'cached_articles';
private readonly SEARCH_CACHE_KEY = 'article_search_cache';

getCachedArticles(): IArticle[] {
  const cached = localStorage.getItem(this.CACHE_KEY);
  return cached ? JSON.parse(cached) : [];
}

setCachedArticles(articles: IArticle[]): void {
  // Limit cache size to 500 articles
  const limitedArticles = articles.slice(0, 500);
  localStorage.setItem(this.CACHE_KEY, JSON.stringify(limitedArticles));
}
```

### Phase 2: Article Search Strategy Service

#### 2.1 Create New Service (`article-search-strategy.service.ts`)
```typescript
import { Injectable } from '@angular/core';
import { Observable, of, Subject, BehaviorSubject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap, timeout, retry } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ArticleSearchStrategyService {
  private cachedArticles: IArticle[] = [];
  private searchCache = new Map<string, IArticle[]>();
  private searchSubject = new Subject<string>();
  private isOnlineMode = new BehaviorSubject<boolean>(true);

  constructor(
    private articleService: ArticlesService,
    private toast: HotToastService
  ) {
    this.setupSearchPipeline();
  }

  private setupSearchPipeline(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => this.performSearch(term))
    ).subscribe();
  }

  async initializeArticles(): Promise<IArticle[]> {
    try {
      // Try to load from backend
      const response = await this.articleService.getTopArticles(200).pipe(
        timeout(5000),
        retry(1)
      ).toPromise();

      this.cachedArticles = response.rows;
      this.articleService.setCachedArticles(this.cachedArticles);
      this.isOnlineMode.next(true);
      return this.cachedArticles;
    } catch (error) {
      // Fallback to cache
      console.warn('Failed to load articles from backend, using cache', error);
      this.cachedArticles = this.articleService.getCachedArticles();
      this.isOnlineMode.next(false);

      if (this.cachedArticles.length === 0) {
        this.toast.error('No articles available offline');
      } else {
        this.toast.warning(`Working offline with ${this.cachedArticles.length} cached articles`);
      }

      return this.cachedArticles;
    }
  }

  search(term: string): Observable<IArticle[]> {
    if (!term || term.length < 2) {
      return of(this.cachedArticles.slice(0, 50));
    }

    // Check cache first
    if (this.searchCache.has(term)) {
      return of(this.searchCache.get(term)!);
    }

    return this.performSearch(term);
  }

  private performSearch(term: string): Observable<IArticle[]> {
    // Try backend first
    return this.articleService.searchArticles(term).pipe(
      timeout(3000),
      retry(1),
      tap(response => {
        // Cache the search results
        this.searchCache.set(term, response.rows);
        this.isOnlineMode.next(true);

        // Add to cached articles if not present
        this.updateCachedArticles(response.rows);
      }),
      map(response => response.rows),
      catchError(error => {
        console.warn('Backend search failed, using local search', error);
        this.isOnlineMode.next(false);

        // Perform local search
        const results = this.localSearch(term);

        if (results.length === 0) {
          this.toast.warning('No matching articles found offline');
        } else {
          this.toast.info(`Found ${results.length} articles offline`);
        }

        return of(results);
      })
    );
  }

  private localSearch(term: string): IArticle[] {
    const searchTerm = term.toLowerCase();
    return this.cachedArticles.filter(article =>
      article.concept?.toLowerCase().includes(searchTerm) ||
      article.brand?.toLowerCase().includes(searchTerm) ||
      article.details?.toLowerCase().includes(searchTerm)
    );
  }

  private updateCachedArticles(newArticles: IArticle[]): void {
    const existingIds = new Set(this.cachedArticles.map(a => a.id));
    const uniqueNewArticles = newArticles.filter(a => !existingIds.has(a.id));

    this.cachedArticles = [...this.cachedArticles, ...uniqueNewArticles].slice(0, 500);
    this.articleService.setCachedArticles(this.cachedArticles);
  }

  clearCache(): void {
    this.searchCache.clear();
    localStorage.removeItem('article_search_cache');
  }

  get onlineStatus$(): Observable<boolean> {
    return this.isOnlineMode.asObservable();
  }
}
```

### Phase 3: Update Article List Manager Component

#### 3.1 Modify Component (`article-list-manager.component.ts`)
```typescript
// Add these properties and methods

searchTerm$ = new BehaviorSubject<string>('');
filteredArticles$ = new Observable<IArticle[]>();
isLoading = false;
isOnline = true;
searchMode: 'backend' | 'cache' = 'backend';

ngOnInit(): void {
  // ... existing code ...

  this.initializeArticleSearch();
  this.setupSearchSubscription();
  this.monitorOnlineStatus();
}

private async initializeArticleSearch(): Promise<void> {
  this.isLoading = true;
  try {
    const initialArticles = await this.searchStrategy.initializeArticles();
    this.articles = initialArticles;
  } finally {
    this.isLoading = false;
  }
}

private setupSearchSubscription(): void {
  this.filteredArticles$ = this.searchTerm$.pipe(
    tap(() => this.isLoading = true),
    switchMap(term => this.searchStrategy.search(term)),
    tap(() => this.isLoading = false)
  );
}

private monitorOnlineStatus(): void {
  this.searchStrategy.onlineStatus$.subscribe(isOnline => {
    this.isOnline = isOnline;
    this.searchMode = isOnline ? 'backend' : 'cache';
  });
}

onArticleSearch(term: string): void {
  this.searchTerm$.next(term);
}

// Method for manual article entry fallback
addManualArticle(): void {
  const dialogRef = this.dialog.open(ManualArticleEntryComponent, {
    width: '400px',
    data: { categories: this.categories }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.addArticleToList(result);
    }
  });
}
```

#### 3.2 Update Template (`article-list-manager.component.html`)
```html
<!-- Update ng-select configuration -->
<div class="w-full mb-4">
  <label class="font-medium">
    Artículo *
    <span *ngIf="!isOnline" class="text-amber-600 text-sm ml-2">
      (Modo sin conexión - {{articles.length}} artículos disponibles)
    </span>
  </label>

  <ng-select
    class="mt-1"
    [items]="filteredArticles$ | async"
    bindLabel="concept"
    bindValue="id"
    formControlName="articleId"
    [loading]="isLoading"
    [typeahead]="searchTerm$"
    [virtualScroll]="true"
    placeholder="Buscar artículo..."
    notFoundText="No se encontraron artículos"
    loadingText="Buscando..."
    [clearable]="true"
    [searchable]="true">

    <!-- Custom not found template -->
    <ng-template ng-notfound-tmp>
      <div class="p-2">
        <p class="text-gray-600">No se encontraron artículos</p>
        <button
          *ngIf="!isOnline"
          mat-button
          color="primary"
          (click)="addManualArticle()"
          class="mt-2">
          Agregar manualmente
        </button>
      </div>
    </ng-template>

    <!-- Custom option template showing more details -->
    <ng-template ng-option-tmp let-item="item">
      <div class="flex justify-between">
        <span>{{item.concept}}</span>
        <span class="text-gray-500 text-sm">{{item.brand}}</span>
      </div>
    </ng-template>
  </ng-select>

  <!-- Offline mode indicator -->
  <mat-chip-list *ngIf="!isOnline" class="mt-2">
    <mat-chip color="warn" selected>
      <mat-icon class="mr-1">cloud_off</mat-icon>
      Trabajando sin conexión
    </mat-chip>
  </mat-chip-list>
</div>
```

### Phase 4: Update Expense Create Modal

#### 4.1 Modify Component (`expenses-create-modal.component.ts`)
```typescript
private loadInitialData(): void {
  forkJoin({
    categories: this.expenseService.getCategories(),
    // Remove the articles loading from here
    merchants: this.merchantService.getMerchantsList({ limit: 10000, fetchAll: 'false' }),
    payments: this.expenseService.getPaymentMethods({
      isActive: true
    })
  }).subscribe({
    next: (response) => {
      this.categories = <any>response.categories;
      // Remove: this.articles = response.articles.rows;
      this.merchants = response.merchants.rows;
      this.payments = response.payments;
    },
    error: (error) => {
      console.error('Error loading initial data:', error);
      // Show user-friendly error message
      this.toast.error('Error al cargar datos. Algunos elementos pueden no estar disponibles.');
    }
  });
}
```

### Phase 5: Manual Article Entry Component (Fallback)

#### 5.1 Create Component (`manual-article-entry.component.ts`)
```typescript
@Component({
  selector: 'app-manual-article-entry',
  template: `
    <h2 mat-dialog-title>Agregar Artículo Manualmente</h2>
    <mat-dialog-content>
      <form [formGroup]="articleForm" class="flex flex-col gap-4">
        <mat-form-field>
          <mat-label>Concepto *</mat-label>
          <input matInput formControlName="concept" required>
        </mat-form-field>

        <mat-form-field>
          <mat-label>Marca</mat-label>
          <input matInput formControlName="brand">
        </mat-form-field>

        <mat-form-field>
          <mat-label>Detalles</mat-label>
          <textarea matInput formControlName="details" rows="2"></textarea>
        </mat-form-field>

        <mat-checkbox formControlName="saveForFuture">
          Guardar para uso futuro (cuando se restablezca la conexión)
        </mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="articleForm.invalid"
        (click)="save()">
        Agregar
      </button>
    </mat-dialog-actions>
  `
})
export class ManualArticleEntryComponent {
  articleForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ManualArticleEntryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.articleForm = this.fb.group({
      concept: ['', Validators.required],
      brand: [''],
      details: [''],
      saveForFuture: [true]
    });
  }

  save(): void {
    if (this.articleForm.valid) {
      const article = {
        ...this.articleForm.value,
        id: `temp_${Date.now()}`, // Temporary ID for offline articles
        isOffline: true
      };

      if (this.articleForm.value.saveForFuture) {
        this.queueForSync(article);
      }

      this.dialogRef.close(article);
    }
  }

  private queueForSync(article: any): void {
    const queue = JSON.parse(localStorage.getItem('offline_articles_queue') || '[]');
    queue.push(article);
    localStorage.setItem('offline_articles_queue', JSON.stringify(queue));
  }
}
```

### Phase 6: Background Sync for Offline Articles

#### 6.1 Create Sync Service (`offline-sync.service.ts`)
```typescript
@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  constructor(
    private articleService: ArticlesService,
    private toast: HotToastService
  ) {
    this.setupOnlineListener();
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.syncOfflineArticles();
    });
  }

  async syncOfflineArticles(): Promise<void> {
    const queue = JSON.parse(localStorage.getItem('offline_articles_queue') || '[]');

    if (queue.length === 0) return;

    this.toast.info(`Sincronizando ${queue.length} artículos creados sin conexión...`);

    const results = await Promise.allSettled(
      queue.map(article => this.articleService.createArticle(article).toPromise())
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (successful > 0) {
      this.toast.success(`${successful} artículos sincronizados exitosamente`);
    }

    if (failed > 0) {
      this.toast.error(`${failed} artículos no pudieron ser sincronizados`);
      // Keep failed articles in queue
      const failedArticles = queue.filter((_, index) => results[index].status === 'rejected');
      localStorage.setItem('offline_articles_queue', JSON.stringify(failedArticles));
    } else {
      localStorage.removeItem('offline_articles_queue');
    }
  }
}
```

## Performance Optimizations

### 1. Implement Virtual Scrolling (Already in place)
- ng-select with `[virtualScroll]="true"`

### 2. Search Result Caching
- Cache search results in memory (Map)
- Expire cache after 5 minutes or on manual refresh

### 3. Preload Common Articles
- Track frequently used articles
- Preload top 50 most used articles

### 4. Lazy Load Additional Data
```typescript
// Load more articles when user scrolls near bottom
onScrollToEnd(): void {
  if (this.isOnline && !this.isLoading) {
    this.loadMoreArticles();
  }
}
```

## Testing Strategy

### Unit Tests
1. Test search strategy fallback logic
2. Test cache management
3. Test offline mode detection
4. Test manual article entry

### Integration Tests
1. Test full search flow with backend
2. Test fallback when backend fails
3. Test sync when coming back online

### E2E Tests
1. Test article selection in expense creation
2. Test offline mode workflow
3. Test search performance with large datasets

## Migration Steps

1. **Phase 1**: Implement backend search service methods (no breaking changes)
2. **Phase 2**: Add search strategy service (new service, no impact)
3. **Phase 3**: Update article-list-manager with feature flag
4. **Phase 4**: Test with small user group
5. **Phase 5**: Enable for all users
6. **Phase 6**: Remove old code after stability confirmed

## Configuration

### Environment Variables
```typescript
// environment.ts
export const environment = {
  articleSearch: {
    enableBackendSearch: true,
    cacheSize: 500,
    searchDebounceMs: 300,
    requestTimeoutMs: 3000,
    initialLoadSize: 200,
    enableOfflineMode: true
  }
};
```

## Monitoring

### Key Metrics to Track
1. Search response times
2. Cache hit rates
3. Fallback frequency
4. Offline mode usage
5. Manual article entries

### Error Tracking
```typescript
// Add to search strategy service
private logSearchMetrics(searchTerm: string, source: 'backend' | 'cache', responseTime: number): void {
  // Send to analytics service
  this.analytics.track('article_search', {
    searchTerm,
    source,
    responseTime,
    resultCount: results.length,
    isOnline: this.isOnline
  });
}
```

## Rollback Plan

If issues arise:
1. Disable backend search via feature flag
2. Revert to loading all articles (current behavior)
3. Clear local storage caches
4. Monitor for 24 hours before re-attempting

## Future Enhancements

1. **Predictive Preloading**: Use ML to predict which articles user will likely need
2. **Smart Caching**: Cache based on user patterns and time of day
3. **Sync Optimization**: Batch sync operations during low-activity periods
4. **Advanced Search**: Add filters for category, brand, price range
5. **Recent Articles**: Quick access to last 10 used articles
6. **Favorites**: Allow marking frequently used articles as favorites

## Notes

- Keep the current implementation as a fallback during transition
- Monitor performance metrics closely during rollout
- Consider A/B testing the new search approach
- Ensure proper error messages in user's language (Spanish)
- Test with slow network conditions (3G simulation)
- Consider implementing a "search as you type" preview