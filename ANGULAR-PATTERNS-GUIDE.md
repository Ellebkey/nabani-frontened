# Angular Patterns & Best Practices Guide

> **FOR LLMs**: This is the authoritative guide for all frontend development in this project. Follow these patterns exactly. When in doubt, reference the `accounts-management` module as the gold standard implementation.

---

## Quick Reference - MUST READ FIRST

### Critical Rules (Never Break These)

| Rule | Do This | Never Do This |
|------|---------|---------------|
| **Styling** | Use Tailwind classes | Write custom SCSS |
| **Inline styles** | When Tailwind truly can't: add a class in a `.scss` file | Use `styles: [...]` in `@Component` |
| **State** | Use signals | Use BehaviorSubject/Observable for state |
| **CRUD Signals** | Update signal AFTER server response | Update signal BEFORE API call |
| **After CRUD** | Update signal + count manually | Call loadItems() (redundant API) |
| **HTTP** | Keep in services, return void | Return Observable from service methods |
| **Components** | Standalone with OnPush (both are the Angular 22 defaults) | NgModule-based components, `standalone: false` |
| **Templates** | Use `@if`, `@for`, `@switch` | Use `*ngIf`, `*ngFor` |
| **Subscriptions** | Use `takeUntilDestroyed()` | Manual unsubscribe in ngOnDestroy |
| **Reusable Logic** | Centralize in services | Duplicate across components |
| **Toast Messages** | Spanish language, via `@ngxpert/hot-toast` | English language, `@ngneat/hot-toast` (dead fork) |
| **Stateful Components** | Keep alive with opacity/pointer-events | Destroy with `@if (isLoading())` |
| **Comments** | Only for complex logic | Comments on obvious code |
| **Dates** | Use `date-fns` / `date-fns-tz`; parse date-only strings with `parseISO` | Use `moment`; `new Date('yyyy-MM-dd')` (shifts a day in UTC-6) |
| **Branching** | Object literal lookups | `switch`/`case` statements in TS |
| **Guards** | Functional `CanActivateFn` exports | Class-based `CanActivate` guards |
| **DI** | `inject()` function | Constructor parameter injection |
| **Inputs/Outputs** | `input()` / `output()` signals | `@Input()` / `@Output()` decorators |
| **View queries** | `viewChild()` / `contentChild()` signals | `@ViewChild` / `@ContentChild` decorators |
| **Heavy widgets** | `@defer` charts/editors below the fold | Eager-loading apexcharts/d3 in the initial bundle |

### File Naming Conventions

```
FEATURE_NAME.component.ts      # Main component
FEATURE_NAME.component.html    # Template
FEATURE_NAME.component.scss    # Styles (only if Tailwind insufficient)
FEATURE_NAME.service.ts        # Service (for shared services)
FEATURE_NAME-api.service.ts    # API layer service
FEATURE_NAME-state.service.ts  # State management service
FEATURE_NAME.model.ts          # Interfaces/types
CONCERN-guard.service.ts       # Route guard (one per concern)
```

### Project Structure

```
src/app/modules/
├── admin/                           # Admin features
│   ├── accounts-management/         # ⭐ REFERENCE IMPLEMENTATION
│   ├── payment-methods/
│   └── tags/
├── expenses/                        # Expense features
│   ├── expenses-list/
│   ├── expenses-create-modal/
│   └── expenses-by-category/
src/app/core/auth/
├── auth.service.ts                  # Auth state (tokens, roles, login/logout)
├── auth-guard.service.ts            # Authentication guard (is user logged in?)
├── role-guard.service.ts            # Role-based guard (does user have required role?)
├── token-interceptor.service.ts     # HTTP interceptor for JWT

src/app/modules/
├── shared/                          # Shared across modules
│   ├── interfaces/                  # Type definitions
│   │   ├── account.model.ts
│   │   ├── expense.model.ts
│   │   └── tag.model.ts
│   └── services/                    # Shared services
│       ├── httpHelpers.service.ts
│       ├── common.service.ts
│       └── tag.service.ts
```

### Model Location

| Scenario | Location | Example |
|----------|----------|---------|
| Shared across modules | `shared/interfaces/` | `expense.model.ts`, `account.model.ts` |
| Feature-specific only | `feature/models/` | `receipt-scan/models/receipt-scan.model.ts` |

Use feature-local models when interfaces are only used within that feature. Move to `shared/interfaces/` when other modules need access.

---

## Angular 22 Platform Notes

- **Bootstrap**: `bootstrapApplication(AppComponent, appConfig)` (`src/app/app.config.ts`); there is no `AppModule`. Feature areas are lazy `Routes` files (`*.routing.ts` / `*.route.ts`) — never NgModules.
- **OnPush is the framework default**; declare it explicitly anyway. `standalone: true` is implicit — never write `standalone: false`.
- **HttpClient** is provided with `withXhr()` for now (interceptor relies on XHR semantics); the fetch backend is the eventual target.
- **Signal Forms** are stable in ng22 but the codebase standardizes on Reactive Forms until we migrate deliberately — don't mix paradigms in one component.
- **TS 6, full `strict: true` + `strictTemplates: true`**: new code must type-check strictly — no `as any`; model optionality honestly (`?`/`| null`) and guard before use. Path aliases live in `paths` (no `baseUrl`).
- **Toasts**: `@ngxpert/hot-toast` (the maintained fork of `@ngneat/hot-toast` — same API).
- **Testing**: jest 30 + `jest-preset-angular` 17. Check the `Test Suites:` line, not just `Tests:` — a suite that fails to compile still prints passing test counts.

---

## Decision Trees

### When Creating a New Feature

```
START
  │
  ├─► Is it an admin/settings feature?
  │     YES → Create in: src/app/modules/admin/FEATURE_NAME/
  │     NO  → Create in: src/app/modules/DOMAIN_NAME/FEATURE_NAME/
  │
  ├─► Does it need state management?
  │     YES → Create: services/state/FEATURE-state.service.ts
  │     NO  → Use shared service or no service
  │
  ├─► Does it make HTTP calls?
  │     YES → Create: services/api/FEATURE-api.service.ts
  │     NO  → Skip API service
  │
  ├─► Does it have a form/modal?
  │     YES → Create in: modals/FEATURE-form-modal/
  │     NO  → Skip modals folder
  │
  └─► Does it have reusable sub-components?
        YES → Create in: components/COMPONENT_NAME/
        NO  → Keep in main component
```

### When Styling a Component

```
START
  │
  ├─► Can Tailwind do this?
  │     YES → Use Tailwind classes in HTML
  │     NO  ↓
  │
  ├─► Is it Angular Material theming?
  │     YES → Use SCSS with ::ng-deep (sparingly)
  │     NO  ↓
  │
  ├─► Is it a complex animation?
  │     YES → Use SCSS @keyframes OR Maguey animations
  │     NO  ↓
  │
  └─► Is it truly unique with no Tailwind equivalent?
        YES → Use minimal SCSS, document why
        NO  → Re-check Tailwind docs, it probably exists
```

> ⚠️ **Tailwind covers 99% of cases — use it always. Only when Tailwind truly cannot achieve the result, add a class to a dedicated `.scss` file (`styleUrl:`). Never use `styles: [...]` in the `@Component` decorator.**
> For Material internals, try Tailwind arbitrary variants before reaching for SCSS:
> - Remove right padding: `[&>.mat-mdc-menu-item-text]:!pr-0`
> - Reset icon margin: `!m-0`

### When Adding Reusable Functionality

```
START
  │
  ├─► Is this logic used by 2+ components?
  │     YES → Extract to service
  │     NO  → Keep in component
  │
  ├─► Is it related to an existing entity (tags, accounts, etc.)?
  │     YES → Add to existing service (tag.service.ts, etc.)
  │     NO  → Create new shared service
  │
  └─► Does it involve constants (colors, options, etc.)?
        YES → Define constants in the service file
        NO  → Just add the method
```

---

## Signals & CRUD: The Golden Rule

> **ALWAYS wait for the server response before updating signals.** Never add items to your signal state until the backend confirms the operation and provides the complete object (especially IDs).

### Why This Matters

When creating a resource, the backend generates the ID. If you update the signal before getting the response:
- You won't have the real ID
- Updates/deletes will fail because you're referencing a non-existent ID
- Your client state diverges from server state

### CRUD Pattern Summary

| Operation | Flow |
|-----------|------|
| **Create** | API Call → Wait for Response (with ID) → Add to Signal |
| **Read** | API Call → Wait for Response → Set Signal |
| **Update** | API Call → Wait for Response → Update Signal with Full Object |
| **Delete** | API Call → Wait for Response → Remove from Signal |

### Correct Implementation

```typescript
// ✅ CORRECT: Wait for server, then update signal
createItem(data: CreateDto): void {
  this.loadingSignal.set(true);

  this.api.create(data).subscribe({
    next: (newItem) => {  // Server returns complete object with ID
      this.itemsSignal.update(items => [...items, newItem]);
      this.paginationSignal.update(p => ({ ...p, count: p.count + 1 }));
      this.toast.success('Creado exitosamente');
      this.loadingSignal.set(false);
      // NO loadItems() call - we already have the data!
    },
    error: () => {
      this.toast.error('Error al crear');
      this.loadingSignal.set(false);
    }
  });
}

// ✅ CORRECT: Wait for server confirmation before removing
deleteItem(id: number): void {
  this.loadingSignal.set(true);

  this.api.delete(id).subscribe({
    next: () => {
      this.itemsSignal.update(items => items.filter(i => i.id !== id));
      this.paginationSignal.update(p => ({ ...p, count: Math.max(0, p.count - 1) }));
      this.toast.success('Eliminado exitosamente');
      this.loadingSignal.set(false);
      // NO loadItems() call - we already updated the signal!
    },
    error: () => {
      this.toast.error('Error al eliminar');
      this.loadingSignal.set(false);
    }
  });
}
```

### Anti-Patterns to Avoid

```typescript
// ❌ WRONG: Calling loadItems() after signal update (redundant API call)
next: (newItem) => {
  this.itemsSignal.update(items => [...items, newItem]);
  this.loadItems();  // WRONG - makes unnecessary API call
}

// ❌ WRONG: Optimistic update without server response
createItem(data: CreateDto): void {
  const tempItem = { ...data, id: 'temp-id' };  // WRONG - fake ID
  this.itemsSignal.update(items => [...items, tempItem]);  // WRONG - before API
  this.api.create(data).subscribe(...);
}

// ❌ WRONG: Removing before server confirms
deleteItem(id: number): void {
  this.itemsSignal.update(items => items.filter(i => i.id !== id));  // WRONG - before API
  this.api.delete(id).subscribe(...);
}
```

---

## Comments Philosophy

**Minimize comments** - code should be self-documenting through clear naming.

**When to add comments:**
- Complex business logic or calculations
- Non-obvious workarounds or edge cases
- Integration notes (e.g., API quirks)

**When NOT to add comments:**
- Section separators in code (use blank lines instead)
- Describing what a method does (the name should tell you)
- Explaining obvious signal or service patterns

```typescript
// ✅ Good - explains non-obvious behavior
// D3-sankey recalculates node.value from links; store original for display
originalValue: node.value,

// ✅ Good - explains workaround
// setTimeout needed because dialog animation interferes with focus
setTimeout(() => this.inputRef.nativeElement.focus(), 100);

// ❌ Avoid - obvious from code
// Load items when component initializes
ngOnInit(): void {
  this.loadItems();
}

// ❌ Avoid - section markers
// === SIGNALS ===
private readonly itemsSignal = signal<Item[]>([]);
```

---

## Service Layer Architecture

### The Two-Service Pattern

For complex features, split into **API Service** (HTTP only) and **State Service** (state management):

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Component  │────►│  State Service   │────►│ API Service │
└─────────────┘     └──────────────────┘     └─────────────┘
                           │                         │
                      (signals)                  (HTTP/RxJS)
```

### API Service Template

**File:** `services/api/feature-api.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { IFeature, IFeatureCreate, FeatureListResponse } from '@shared/interfaces/feature.model';

@Injectable({ providedIn: 'root' })
export class FeatureApiService extends HttpHelpersService {
  private readonly http = inject(HttpClient);

  // GET list with pagination
  getAll(params: { limit: number; offset: number; searchText?: string }): Observable<FeatureListResponse> {
    const httpParams = this.createHttpParams(params);
    return this.http.get<FeatureListResponse>(`${this.API_URL}/features`, { params: httpParams });
  }

  // GET single by ID
  getById(id: number): Observable<IFeature> {
    return this.http.get<IFeature>(`${this.API_URL}/features/${id}`);
  }

  // POST create
  create(data: IFeatureCreate): Observable<IFeature> {
    return this.http.post<IFeature>(`${this.API_URL}/features`, data);
  }

  // PUT update
  update(id: number, data: Partial<IFeature>): Observable<IFeature> {
    return this.http.put<IFeature>(`${this.API_URL}/features/${id}`, data);
  }

  // DELETE
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/features/${id}`);
  }
}
```

### State Service Template

**File:** `services/state/feature-state.service.ts`

```typescript
import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HotToastService } from '@ngxpert/hot-toast';
import { FeatureApiService } from '../api/feature-api.service';
import { IFeature, IFeatureCreate } from '@shared/interfaces/feature.model';

@Injectable({ providedIn: 'root' })
export class FeatureStateService {
  private readonly api = inject(FeatureApiService);
  private readonly toast = inject(HotToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly itemsSignal = signal<IFeature[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly paginationSignal = signal({
    limit: 25,
    offset: 0,
    count: 0,
    searchText: '',
    showInputSearch: true
  });

  readonly items = this.itemsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly pagination = this.paginationSignal.asReadonly();

  readonly itemCount = computed(() => this.itemsSignal().length);
  readonly isEmpty = computed(() => !this.loadingSignal() && this.itemCount() === 0);
  readonly hasItems = computed(() => this.itemCount() > 0);

  loadItems(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params = this.paginationSignal();

    this.api.getAll(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.itemsSignal.set(response.rows);
          this.paginationSignal.update(p => ({ ...p, count: response.count }));
          this.loadingSignal.set(false);
        },
        error: () => {
          this.errorSignal.set('Error al cargar los datos');
          this.toast.error('Error al cargar los datos');
          this.loadingSignal.set(false);
        }
      });
  }

  createItem(data: IFeatureCreate): void {
    this.loadingSignal.set(true);

    this.api.create(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newItem) => {
          // Update signal with server response (has real ID)
          this.itemsSignal.update(items => [...items, newItem]);
          // Update count manually
          this.paginationSignal.update(p => ({ ...p, count: p.count + 1 }));
          this.toast.success('Creado exitosamente');
          this.loadingSignal.set(false);
          // NO loadItems() - we already have the data
        },
        error: () => {
          this.toast.error('Error al crear');
          this.loadingSignal.set(false);
        }
      });
  }

  updateItem(id: number, data: Partial<IFeature>): void {
    this.loadingSignal.set(true);

    this.api.update(id, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedItem) => {
          this.itemsSignal.update(items =>
            items.map(item => item.id === id ? updatedItem : item)
          );
          this.toast.success('Actualizado exitosamente');
          this.loadingSignal.set(false);
        },
        error: () => {
          this.toast.error('Error al actualizar');
          this.loadingSignal.set(false);
        }
      });
  }

  deleteItem(id: number): void {
    this.loadingSignal.set(true);

    this.api.delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Remove from signal after server confirms
          this.itemsSignal.update(items => items.filter(item => item.id !== id));
          // Update count manually
          this.paginationSignal.update(p => ({ ...p, count: Math.max(0, p.count - 1) }));
          this.toast.success('Eliminado exitosamente');
          this.loadingSignal.set(false);
          // NO loadItems() - we already updated the signal
        },
        error: () => {
          this.toast.error('Error al eliminar');
          this.loadingSignal.set(false);
        }
      });
  }

  updatePagination(params: Partial<typeof this.paginationSignal>): void {
    this.paginationSignal.update(p => ({ ...p, ...params }));
    this.loadItems();
  }
}
```

### Shared Service Template (Simpler Features)

**File:** `shared/services/feature.service.ts`

For simpler features that don't need state management separation:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { IFeature, IFeatureCreate, FeatureListResponse } from '@shared/interfaces/feature.model';

// User-picked colors ALWAYS come from the Maguey muted palette (see THEME.md)
import { MAGUEY_USER_COLORS } from '@shared/services/maguey-palette';

@Injectable({ providedIn: 'root' })
export class FeatureService extends HttpHelpersService {
  constructor(private http: HttpClient) {
    super();
  }

  // Standard CRUD methods
  getAll(query: Query = {}): Observable<FeatureListResponse> {
    const params = this.createHttpParams(query);
    return this.http.get<FeatureListResponse>(`${this.API_URL}/features`, { params });
  }

  getById(id: number): Observable<IFeature> {
    return this.http.get<IFeature>(`${this.API_URL}/features/${id}`);
  }

  create(data: IFeatureCreate): Observable<IFeature> {
    return this.http.post<IFeature>(`${this.API_URL}/features`, data);
  }

  update(id: number, data: Partial<IFeature>): Observable<IFeature> {
    return this.http.put<IFeature>(`${this.API_URL}/features/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/features/${id}`);
  }

  // Utility method that would otherwise be duplicated
  createWithRandomColor(name: string): Observable<IFeature> {
    const randomColor = MAGUEY_USER_COLORS[Math.floor(Math.random() * MAGUEY_USER_COLORS.length)];
    return this.create({ name: name.trim(), color: randomColor });
  }
}
```

---

## Route Guards

Guards live in `src/app/core/auth/` with **one file per concern**. Use functional `CanActivateFn` — never class-based guards.

### Guard File Pattern

**File:** `CONCERN-guard.service.ts` — exports a single `CanActivateFn`

```typescript
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const myGuardFn: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);

  if (!someCheck) {
    return inject(Router).createUrlTree(['/fallback']);
  }
  return true;
};
```

### Current Guards

| Guard | File | Purpose | Usage |
|-------|------|---------|-------|
| `authGuardFn` | `auth-guard.service.ts` | Is the user logged in? | `canActivate: [authGuardFn]` |
| `roleGuardFn` | `role-guard.service.ts` | Does user have `route.data.expectedRole`? | `canActivate: [roleGuardFn]` + `data: { expectedRole: 'admin' }` |

### Rules

| Rule | Do This | Never Do This |
|------|---------|---------------|
| **One concern per file** | `auth-guard.service.ts`, `role-guard.service.ts` | Merge all guards into one file |
| **Pattern** | Export a `CanActivateFn` function | Class-based `@Injectable` + `CanActivate` |
| **DI** | Use `inject()` inside the function | Constructor injection |
| **Return** | Return `boolean` or `UrlTree` directly | Wrap in `of()` / `Observable` unnecessarily |
| **Redirect** | `inject(Router).createUrlTree(['/path'])` | `router.navigate()` (guard must return, not navigate) |
| **Role data** | `route.data['expectedRole']` on the route | Hardcode roles inside the guard |

### Applying Guards to Routes

```typescript
// Authentication only (all logged-in users)
{ path: 'dashboard', canActivate: [authGuardFn], ... }

// Authentication + role check (stack guards)
{ path: 'categories', canActivate: [authGuardFn, roleGuardFn], data: { expectedRole: 'admin' }, ... }
```

> When a route already inherits `authGuardFn` from a parent, child routes only need `roleGuardFn`.

### Hiding Navigation Items by Role

Use Maguey's built-in `hidden` callback on `MagueyNavigationItem`. Apply it in `NavigationService`, not in static menu data:

```typescript
// navigation.service.ts
{ ...child, hidden: () => !this.authService.isAdmin() }
```

---

## Component Layer

### Main Component Template

**File:** `feature.component.ts`

```typescript
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PagerComponent } from '@shared/components/pager/pager.component';

import { FeatureStateService } from './services/state/feature-state.service';
import { FeatureFormModalComponent } from './modals/feature-form-modal/feature-form-modal.component';
import { IFeature } from '@shared/interfaces/feature.model';

@Component({
  selector: 'app-feature',
  templateUrl: './feature.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    PagerComponent
  ]
})
export class FeatureComponent implements OnInit {
  private readonly state = inject(FeatureStateService);
  private readonly dialog = inject(MatDialog);

  protected readonly items = this.state.items;
  protected readonly loading = this.state.loading;
  protected readonly error = this.state.error;
  protected readonly pagination = this.state.pagination;
  protected readonly isEmpty = this.state.isEmpty;

  ngOnInit(): void {
    this.state.loadItems();
  }

  protected onPaginationChanged(event: any): void {
    this.state.updatePagination(event);
  }

  protected openCreateModal(): void {
    const dialogRef = this.dialog.open(FeatureFormModalComponent, {
      width: '600px',
      disableClose: true,
      data: null  // null = create mode
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.state.createItem(result);
      }
    });
  }

  protected openEditModal(item: IFeature): void {
    const dialogRef = this.dialog.open(FeatureFormModalComponent, {
      width: '600px',
      disableClose: true,
      data: item  // item = edit mode
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.state.updateItem(item.id, result);
      }
    });
  }

  protected deleteItem(item: IFeature): void {
    // Use MagueyConfirmationService for delete confirmation
    // For now, simple confirm
    if (confirm(`¿Estás seguro de eliminar "${item.name}"?`)) {
      this.state.deleteItem(item.id);
    }
  }
}
```

### Main Component HTML Template

**File:** `feature.component.html`

```html
<div class="flex flex-col flex-auto w-full">
  <div class="flex flex-wrap w-full max-w-screen-xl mx-auto p-6 md:p-8">

    <!-- Header Section -->
    <div class="flex items-center justify-between w-full">
      <div>
        <h2 class="text-3xl font-semibold tracking-tight leading-8">
          Feature Title
        </h2>
        <div class="font-medium tracking-tight text-secondary mt-1">
          Feature description here
        </div>
      </div>

      <div class="flex items-center ml-6">
        <button
          class="inline-flex items-center ml-3"
          mat-flat-button
          [color]="'primary'"
          (click)="openCreateModal()">
          <mat-icon class="icon-size-5 mr-2">add</mat-icon>
          Nuevo Item
        </button>
      </div>
    </div>

    <!-- Pagination -->
    <div class="w-full mt-8">
      <mg-pager
        [limit]="pagination().limit"
        [offset]="pagination().offset"
        [count]="pagination().count"
        (pageChange)="onPaginationChanged($event)">
      </mg-pager>
    </div>

    <!-- Content Section -->
    <div class="w-full mt-8">
      @if (loading()) {
        <!-- Loading Skeleton -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          @for (item of [1, 2, 3, 4, 5, 6, 7, 8]; track item) {
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          }
        </div>
      } @else if (isEmpty()) {
        <!-- Empty State -->
        <div class="text-center py-16">
          <div class="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <mat-icon class="text-4xl text-gray-400">inventory_2</mat-icon>
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay items registrados
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-6">
            Crea un item para empezar
          </p>
          <button
            mat-flat-button
            [color]="'primary'"
            (click)="openCreateModal()">
            <mat-icon class="icon-size-5 mr-2">add</mat-icon>
            Crear Primer Item
          </button>
        </div>
      } @else {
        <!-- Items Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          @for (item of items(); track item.id) {
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <!-- Item content here -->
            </div>
          }
        </div>
      }
    </div>
  </div>
</div>
```

### Modal Form Component Template

**File:** `modals/feature-form-modal/feature-form-modal.component.ts`

```typescript
import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { IFeature, IFeatureCreate } from '@shared/interfaces/feature.model';

@Component({
  selector: 'app-feature-form-modal',
  templateUrl: './feature-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ]
})
export class FeatureFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<FeatureFormModalComponent>);
  protected readonly data = inject<IFeature | null>(MAT_DIALOG_DATA);

  form: FormGroup;

  protected readonly isSubmitting = signal(false);
  protected readonly isEditMode = computed(() => this.data !== null);
  protected readonly modalTitle = computed(() =>
    this.isEditMode() ? 'Editar Item' : 'Nuevo Item'
  );

  constructor() {
    this.form = this.createForm();
    this.initializeForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]]
    });
  }

  private initializeForm(): void {
    if (this.data) {
      this.form.patchValue({
        name: this.data.name,
        description: this.data.description || ''
      });
    }
  }

  protected onSubmit(): void {
    if (this.form.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);

      const result: IFeatureCreate = {
        name: this.form.value.name.trim(),
        description: this.form.value.description?.trim() || null
      };

      // Small delay for UX
      setTimeout(() => {
        this.dialogRef.close(result);
      }, 300);
    }
  }

  protected onCancel(): void {
    this.dialogRef.close(null);
  }
}
```

### Modal HTML Structure

All modals wrap their content in the shared `mg-modal-shell` (green header, close button, scrollable body, footer slot):

```html
<mg-modal-shell title="Título del modal" (closed)="onCancel()">
  <!-- Body content -->
  <div class="flex flex-col gap-4">
    ...form fields...
  </div>

  <!-- Footer -->
  <ng-container mgModalFooter>
    <button mat-stroked-button (click)="onCancel()">Cancelar</button>
    <button mat-flat-button color="primary" (click)="onSubmit()">Guardar</button>
  </ng-container>
</mg-modal-shell>
```

**Key requirements:**
- Modal WIDTH is set in `dialog.open(..., { width: '420px' })`, never in template classes
- `mg-modal-shell` already handles the `-m-6` MatDialog padding cancellation
- Full-height modals add `h-[calc(100%+3rem)]` on the host

---

## Styling Rules

### Tailwind-First Approach

**ALWAYS use Tailwind. NEVER write custom CSS unless absolutely necessary.**

> **Colors come from the Maguey tokens — see `THEME.md`.** Use `bg-canvas`/`bg-card`/`bg-surface`, `text-ink`/`-2`/`-3`, `border-line`; never `bg-white`, gray scales, or `dark:` variants in app code (the CSS variables flip automatically).

#### Common Tailwind Patterns

```html
<!-- Card (the bg-card class also applies the global 1px border) -->
<div class="bg-card rounded-card p-6">

<!-- Flex layout with gap -->
<div class="flex items-center justify-between gap-4">

<!-- Grid responsive layout -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

<!-- Text (theme-aware inks) -->
<h3 class="text-[15px] font-semibold text-ink">
<p class="text-[12.5px] text-ink-3">

<!-- Button-like element -->
<div class="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">

<!-- Loading skeleton -->
<mg-skeleton class="h-4 w-3/4 rounded"></mg-skeleton>

<!-- Color dot/indicator -->
<span class="w-3 h-3 rounded-full flex-shrink-0" [style.background-color]="item.color">

<!-- Truncate text -->
<span class="truncate max-w-xs">

<!-- Line clamp (multi-line truncate) -->
<p class="line-clamp-2">
```

#### When SCSS is Acceptable

1. **Angular Material theming overrides**
2. **Complex @keyframes animations not in Tailwind**
3. **Third-party component styling**

```scss
// ONLY for things Tailwind can't do
// Example: Custom fade-in-up animation
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
}
```

> Always use a dedicated `.scss` file (`styleUrl: './feature.component.scss'`).
> Inline `styles: [...]` in the decorator is forbidden.

#### Remove Empty SCSS Files

If a component's SCSS file is empty or only has comments:
1. Delete the `.scss` file
2. Remove `styleUrl` from the component decorator

```typescript
// BEFORE (with empty SCSS)
@Component({
  selector: 'app-feature',
  templateUrl: './feature.component.html',
  styleUrl: './feature.component.scss',  // Remove this line
})

// AFTER
@Component({
  selector: 'app-feature',
  templateUrl: './feature.component.html',
})
```

---

## UI Development Rules

### Rule 1: Centralize Reusable Logic in Services

When the same code appears in 2+ components, extract it to a service.

```typescript
// ❌ BAD: Duplicated in multiple components
// component-a.ts
const colors = ['#EF4444', '#F97316', ...];
const randomColor = colors[Math.floor(Math.random() * colors.length)];

// component-b.ts
const colors = ['#EF4444', '#F97316', ...]; // Same array!
const randomColor = colors[Math.floor(Math.random() * colors.length)];

// ✅ GOOD: Centralized in service
// tag.service.ts — colors come from the shared muted palette
import { MAGUEY_USER_COLORS } from '@shared/services/maguey-palette';

createTagWithRandomColor(name: string): Observable<ITag> {
  const randomColor = MAGUEY_USER_COLORS[Math.floor(Math.random() * MAGUEY_USER_COLORS.length)];
  return this.createTag({ name: name.trim(), color: randomColor });
}
```

### Rule 2: Prefer Tailwind Classes Over Custom CSS

See [Styling Rules](#styling-rules) section above.

### Rule 3: Use Spanish for User-Facing Text

All toast messages, labels, placeholders, and error messages should be in Spanish.

```typescript
// ✅ GOOD
this.toast.success('Creado exitosamente');
this.toast.error('Error al cargar los datos');
placeholder="Buscar etiquetas..."

// ❌ BAD
this.toast.success('Created successfully');
this.toast.error('Error loading data');
placeholder="Search tags..."
```

### Rule 4: Follow Consistent Modal Patterns

```typescript
// Create modal: data = null
this.dialog.open(FormModal, { data: null });

// Edit modal: data = item
this.dialog.open(FormModal, { data: existingItem });

// In modal, check mode with computed
readonly isEditMode = computed(() => this.data !== null);
readonly modalTitle = computed(() =>
  this.isEditMode() ? 'Editar X' : 'Nuevo X'
);
```

### Rule 5: Handle Loading, Empty, and Error States

Every list component should handle:
1. **Loading state** - Show skeleton/spinner
2. **Empty state** - Show message + CTA button
3. **Error state** - Show error message (optional retry)

```html
@if (loading()) {
  <!-- Skeleton -->
} @else if (isEmpty()) {
  <!-- Empty state with CTA -->
} @else if (error()) {
  <!-- Error message -->
} @else {
  <!-- Content -->
}
```

---

## Signal Inputs, Outputs & Queries

Use the signal-based APIs — the decorators are legacy:

```typescript
export class TileComponent {
  // Inputs are signals: read as color() in class and template
  readonly color = input<string>('#5F7386');       // optional with default
  readonly label = input.required<string>();       // required
  readonly disabled = input(false, { transform: booleanAttribute });

  // Outputs
  readonly selected = output<string>();            // .emit(value)

  // Queries are signals too — they return undefined until the view resolves
  private readonly panel = viewChild<TemplateRef<unknown>>('panel');
  private readonly rows = viewChildren(RowComponent);
}
```

Rules:
- An input that the component itself reassigns cannot be `input()` — keep a signal-backed `@Input()` setter/getter pair (see `article-list-manager`) and document why.
- In specs, set inputs with `fixture.componentRef.setInput('color', '#000')`; query signals are read-only — stub with `jest.spyOn(component, 'panel').mockReturnValue(...)`, never assign.
- Two-way binding: `model()` when the child owns the value (`[(value)]`).

## Zoneless Change Detection

The app runs **zoneless** (`provideZonelessChangeDetection()`, no zone.js polyfill). What this means day to day:

- Signals and Angular-managed event listeners (any `(click)`, `(input)`, directive host listener) schedule change detection automatically — the normal component patterns just work.
- **INVARIANT: templates only read signals — reactive-form state included.** Never read `form.invalid`, `form.value.x` or `form.get('x').errors` directly in a template: it happens to refresh on user events, but goes silently stale the moment a value is set programmatically (HTTP callback, timer). Bridge every form whose state the template needs:

```typescript
// form built in a FIELD INITIALIZER (toSignal needs an injection context)
private readonly formEvents = toSignal(this.form.events); // value+status+touched+pristine (unified stream)
readonly formInvalid = computed(() => { this.formEvents(); return this.form.invalid; });
readonly formValue   = computed(() => { this.formEvents(); return this.form.getRawValue(); });
readonly nameErrors  = computed(() => { this.formEvents(); return this.form.get('name')?.errors ?? null; });
```

`[formGroup]` / `formControlName` bindings stay as-is — only state READS go through signals.

- Anything else async that mutates rendered state outside Angular (third-party callbacks, IntersectionObserver, WebSocket handlers) must land in a signal (`.set()`/`.update()`), which schedules the render.
- Renders are async now: after a click, the DOM updates on the next scheduled tick, not synchronously. E2E locators must be unambiguous about which element they target (see the Apartados `$0.00` case — two matching inputs, panel renders a beat later).

## Deferred Loading

Wrap heavy, below-the-fold widgets (charts, editors) in `@defer` so their bundles load on demand:

```html
@defer (on viewport) {
  <apx-chart [series]="series()" ... />
} @placeholder {
  <mg-skeleton class="h-64 w-full rounded-card"></mg-skeleton>
}
```

## Data Fetching Note

`resource()` / `httpResource()` are stable in Angular 22 and are the eventual direction for read paths (signal in, signal out, built-in loading/error state). The codebase standardizes on the Observable service pattern above for now — adopt resources deliberately per feature, not ad hoc in the middle of one.

---

## Template Syntax Reference

### Control Flow (Angular 17+)

```html
<!-- Conditional -->
@if (condition) {
  <div>Content</div>
} @else if (otherCondition) {
  <div>Other content</div>
} @else {
  <div>Fallback</div>
}

<!-- Loop -->
@for (item of items(); track item.id) {
  <div>{{ item.name }}</div>
} @empty {
  <div>No items</div>
}

<!-- Switch -->
@switch (status) {
  @case ('active') {
    <span class="text-green-500">Active</span>
  }
  @case ('inactive') {
    <span class="text-red-500">Inactive</span>
  }
  @default {
    <span class="text-gray-500">Unknown</span>
  }
}
```

### Signal Usage in Templates

```html
<!-- Call signal as function -->
<div>{{ items().length }}</div>
<div>{{ pagination().count }}</div>

<!-- In structural directives -->
@if (loading()) { ... }
@for (item of items(); track item.id) { ... }

<!-- With null check -->
@if (selectedItem(); as item) {
  <div>{{ item.name }}</div>
}
```

---

## Common Patterns Cheat Sheet

### Toast Messages (Spanish)

```typescript
// Success
this.toast.success('Creado exitosamente');
this.toast.success('Actualizado exitosamente');
this.toast.success('Eliminado exitosamente');
this.toast.success(`Etiqueta "${name}" creada`);

// Error
this.toast.error('Error al cargar los datos');
this.toast.error('Error al crear');
this.toast.error('Error al actualizar');
this.toast.error('Error al eliminar');
this.toast.error('Error al crear la etiqueta');
```

### Form Validation

```typescript
this.fb.group({
  name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
  email: ['', [Validators.required, Validators.email]],
  amount: [0, [Validators.required, Validators.min(0)]],
  description: ['', [Validators.maxLength(500)]],
  color: [MAGUEY_USER_COLORS[0], [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
});
```

### HTTP Params Helper

```typescript
// In service extending HttpHelpersService
const params = this.createHttpParams({
  limit: pagination.limit,
  offset: pagination.offset,
  searchText: pagination.searchText,
  startDate: filters.startDate,
  endDate: filters.endDate,
});
```

---

## Checklist Before Submitting Code

- [ ] Using Tailwind classes (no custom CSS unless necessary)
- [ ] Using signals for state (not BehaviorSubject)
- [ ] CRUD updates signal AFTER server response (not before)
- [ ] No redundant loadItems() after create/update/delete
- [ ] Pagination count updated manually after create/delete
- [ ] Using `@if`/`@for` syntax (not `*ngIf`/`*ngFor`)
- [ ] Service methods return `void` (not Observable)
- [ ] Using `takeUntilDestroyed()` for subscriptions
- [ ] Toast messages are in Spanish
- [ ] Empty SCSS files removed
- [ ] Reusable logic is in services (not duplicated)
- [ ] Component uses `ChangeDetectionStrategy.OnPush`
- [ ] Component is `standalone: true`
- [ ] Loading, empty, and error states handled
- [ ] Stateful components (pagination) not destroyed by loading `@if` conditions
- [ ] Comments only for complex logic (no section markers or obvious descriptions)

---

## Material Table Patterns

### Table Background - Use Transparent

Material tables have their own background styles. To inherit from parent container:

```html
<!-- ✅ CORRECT: Table inherits bg from parent -->
<div class="bg-card shadow rounded-2xl overflow-hidden">
  <div class="overflow-x-auto mx-6">
    <table mat-table [dataSource]="data" class="w-full bg-transparent">
      ...
    </table>
  </div>
</div>

<!-- ❌ WRONG: Adding bg classes to table/wrapper -->
<div class="overflow-x-auto bg-card">
  <table mat-table class="w-full bg-card">
```

### Table Structure Pattern (from articles-list)

```html
<!-- Container with card styling -->
<div class="bg-card shadow rounded-2xl overflow-hidden">
  <!-- Optional header -->
  <div class="p-6">
    <div class="text-lg font-medium">Title</div>
  </div>

  <!-- Table wrapper - NO background, just margin -->
  <div class="overflow-x-auto mx-6">
    <table mat-table [dataSource]="dataSource" class="w-full bg-transparent">

      <!-- Column definitions -->
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let item">
          <span class="pr-6 whitespace-nowrap">{{ item.name }}</span>
        </td>
      </ng-container>

      <!-- Row definitions - just height, NO bg classes -->
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns;" class="h-14"></tr>
    </table>
  </div>
</div>
```

### Use mg-pager (not mat-paginator)

Always use the shared `mg-pager` component instead of Angular Material's `mat-paginator` (the old `server-table-pagination` library was removed):

```typescript
// Component
import { PagerComponent } from '@shared/components/pager/pager.component';
import { PaginationSetting } from '@shared/interfaces/shared.model';

@Component({
  imports: [PagerComponent, ...],
})
export class MyComponent {
  readonly pagination = signal<PaginationSetting>({
    limit: 25,
    offset: 0,
    count: 0,
  });

  onPageChange(event: { limit: number; offset: number }): void {
    this.pagination.update(p => ({ ...p, ...event }));
    this.loadData();
  }
}
```

```html
<!-- Template -->
<mg-pager
  [limit]="pagination().limit"
  [offset]="pagination().offset"
  [count]="pagination().count"
  (pageChange)="onPageChange($event)">
</mg-pager>
```

### Preserve Pagination Component State (Critical!)

**Problem:** a pager keeps internal state (`currentPage`). If the component is destroyed and recreated (e.g., by `@if` conditions), it resets to page 1.

**Common Bug Pattern:**

```html
<!-- ❌ WRONG: Pagination destroyed during loading, loses currentPage state -->
@if (isLoading()) {
  <mat-spinner></mat-spinner>
}

@if (!isLoading() && items().length) {
  <table>...</table>
  <mg-pager ...></mg-pager>
}
```

When user clicks page 2:
1. `loadData()` sets `isLoading = true`
2. `@if` condition becomes false → **pagination component destroyed**
3. Data loads, `isLoading = false`
4. `@if` condition becomes true → **pagination recreated with `currentPage = 1`**
5. User sees page 1 even though they clicked page 2

**Solution:** Keep pagination alive by separating its condition from loading state:

```html
<!-- ✅ CORRECT: Pagination stays alive, just dims during loading -->
@if (isLoading()) {
  <mat-spinner></mat-spinner>
}

@if (items().length) {
  <div [class.opacity-50]="isLoading()">
    <table>...</table>
  </div>
}

<!-- Pagination condition based on count, not loading state -->
@if (pagination.count > 0) {
  <div [class.opacity-50]="isLoading()" [class.pointer-events-none]="isLoading()">
    <mg-pager
      [limit]="pagination().limit"
      [offset]="pagination().offset"
      [count]="pagination().count"
      (pageChange)="onPageChange($event)">
    </mg-pager>
  </div>
}
```

**Key Points:**
- Use `opacity-50` + `pointer-events-none` to disable during loading instead of destroying
- Base pagination visibility on `count > 0` (data exists) not `!isLoading()`
- This preserves the component's internal `currentPage` state across data reloads

---

## Card & Background Patterns

### Use bg-card (Not bg-white)

Always use `bg-card` class for card backgrounds. It handles dark mode automatically:

```html
<!-- ✅ CORRECT -->
<div class="bg-card shadow rounded-2xl">

<!-- ❌ WRONG: Don't manually specify dark mode bg -->
<div class="bg-white dark:bg-gray-900 shadow rounded-2xl">
```

### Nested Elements Inherit Background

Don't add redundant `bg-card` to nested elements:

```html
<!-- ✅ CORRECT: Only parent has bg-card -->
<div class="bg-card shadow rounded-2xl overflow-hidden">
  <div class="p-4 border-b border-gray-200">Header</div>
  <div class="p-4">Content inherits background</div>
</div>

<!-- ❌ WRONG: Redundant bg-card on children -->
<div class="bg-card">
  <div class="bg-card p-4">Redundant!</div>
</div>
```

---

## Conditional Rendering with Data

### Check Actual Data, Not Just Array Length

When showing sections based on data, verify there's meaningful data:

```typescript
// ✅ CORRECT: Check if any item has actual data
get hasTagsWithExpenses(): boolean {
  return this.tagSummaries?.some(tag => tag.expenseCount > 0) ?? false;
}

// ❌ WRONG: Just checking array length
// Shows empty section if all tags have 0 expenses
@if (tagSummaries.length > 0) { ... }
```

```html
<!-- ✅ CORRECT -->
@if (hasTagsWithExpenses) {
  <div class="tag-summary-section">
    @for (tag of tagSummaries; track tag.id) {
      @if (tag.expenseCount > 0) {
        <div>{{ tag.name }}: {{ tag.totalAmount }}</div>
      }
    }
  </div>
}
```

---

## D3 Chart Patterns

### Preserve Original Values in D3-Sankey

D3-sankey recalculates node values based on link flows. Store original values before processing:

```typescript
interface SankeyNodeData extends SankeyNode {
  originalValue?: number;  // Preserve before d3 recalculates
}

// When preparing data for d3
const nodes = data.nodes.map((node, index) => ({
  ...node,
  index,
  originalValue: node.value,  // Store original
}));

// After d3 processes, use originalValue for labels
node.append('text')
  .text((d) => formatCurrency(d.originalValue ?? d.value));
```

### Dynamic Color Palette from Primary Color

Generate color variations from a primary color using HSL:

```typescript
// Convert hex to HSL
private hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  // ... conversion logic
}

// Generate palette with varying lightness
private generatePalette(primaryColor: string): string[] {
  const hsl = this.hexToHsl(primaryColor);
  if (!hsl) return this.defaultColors;

  return [
    this.hslToHex(hsl.h, hsl.s, hsl.l + 10),
    this.hslToHex(hsl.h, hsl.s, hsl.l + 20),
    this.hslToHex(hsl.h, hsl.s, hsl.l - 10),
    // ... more variations
  ];
}
```

---

*Last Updated: 2026-07-03*
*Angular Version: 22 (standalone bootstrap, signals, OnPush by default)*
*Pattern Status: Production-Ready*
