# Maguey Frontend — How It Works & How to Build a Feature (Nabani base template)

> Source analyzed: `/home/jbarranco/Proyectos/maguey/maguey-frontend`
> Angular **22.0.5** + Tailwind **3.4.3** + Angular Material **22** (MDC) + Signals + Zoneless.
> This document is the reference for replicating Maguey's patterns to build **Nabani** (a nutrition-clinic app).

---

## 0. TL;DR — the mental model

Maguey is a **modernized descendant of a Fuse Angular template**. The git history tells the whole story:
`@fuse → @maguey` engine rename (`5bc9dc2`), Angular 21→22 upgrade (`30baecf`), zoneless + signal inputs + TS strict (`c40968a`, `bf84eac`, `7154276`), and a screen-by-screen "Maguey 2.0 / Agave" design-conformance pass (`0465c1c`, `396b484`).

Two layers to understand:

1. **The engine** — `src/@maguey/` — the former Fuse core, renamed. Navigation, alert, loading-bar, splash-screen, confirmation dialog, config service, media-watcher, the Tailwind theming plugins. You rarely touch this; you consume it.
2. **The app** — `src/app/` — feature modules (`expenses`, `incomes`, `accounts`, `family`, `admin`, `reports`, `inventory`, `auth`), a shared design-system component library (`src/app/modules/shared/components`), core services (auth, theme, navigation, icons), and the layout shell.

The design system ("**Agave 2.0**", the internal codename seen in the handoff CSS header) is **token-first Tailwind utilities + a small library of `mg-*` Angular presentational components**. It is production-ready and battle-tested. Dark mode works via CSS-variable flipping.

---

## 1. Architecture & Conventions

### 1.1 Angular 22 features in use (all of them, everywhere)

| Feature | Status | Evidence |
|---|---|---|
| **Standalone components** | 100%. No NgModules. `bootstrapApplication`. | `src/main.ts`, every component |
| **Signals** for state | Standard for all component/local state | `signal()`, `computed()`, `.update()` in every feature |
| **Signal inputs/outputs/queries** | `input()`, `input.required()`, `output()`, `viewChild()`, `model()` | `pill.component.ts`, `compact-select.component.ts` |
| **New control flow** | `@if / @for / @switch / @empty / @defer` — no `*ngIf`/`*ngFor` | every template |
| **`inject()`** | Enforced by ESLint (`@angular-eslint/prefer-inject`). No constructor DI. | `incomes.component.ts` |
| **Zoneless change detection** | `provideZonelessChangeDetection()`, no zone.js polyfill | `app.config.ts` |
| **OnPush** | Enforced by ESLint on every component | `changeDetection: ChangeDetectionStrategy.OnPush` everywhere |
| **`@defer`** | Charts/heavy widgets lazy-load on viewport | ANGULAR-PATTERNS-GUIDE.md §Deferred Loading |
| **Functional guards** | `CanActivateFn`, never class guards | `auth-guard.service.ts` |
| **`provideHttpClient` + fetch** | interceptors from DI | `app.config.ts` |
| **`toSignal(form.events)`** | Bridges reactive-form state into signals (zoneless invariant) | see §3.3 |

> **Zoneless invariant (critical, will bite Nabani):** templates may only READ signals. Never read `form.invalid` / `form.value.x` directly in a template — it goes stale when a value is set programmatically. Bridge every form via `toSignal(this.form.events)` + `computed()`. See ANGULAR-PATTERNS-GUIDE.md §Zoneless Change Detection.

### 1.2 Folder structure

```
src/
├── @maguey/                      # The engine (renamed Fuse core) — consume, don't edit
│   ├── components/               # alert, loading-bar, navigation/vertical, splash-screen
│   ├── directives/scrollbar
│   ├── services/                 # config, confirmation, media-watcher, splash-screen, platform, utils
│   ├── tailwind/plugins/         # utilities, icon-size, theming (Fuse-derived)
│   └── styles/                   # tailwind.scss, themes.scss (Material --mat-sys-* wiring), overrides
├── app/
│   ├── core/                     # auth (service+guards+interceptor), theme, navigation, icons, title
│   ├── layout/                   # layout.component + layouts/{empty,vertical/compact} + common/{user,draft-notification}
│   └── modules/
│       ├── shared/               # THE DESIGN SYSTEM + shared services + interfaces (models)
│       │   ├── components/       # mg-pill, mg-tile, mg-modal-shell, mg-pager, mg-empty-state, ...
│       │   ├── interfaces/       # *.model.ts (all domain models live here)
│       │   └── services/         # httpHelpers, pagination, chart, common, tag, maguey-palette
│       ├── accounts/  expenses/  incomes/  inventory/  reports/  family/  admin/  profile/  auth/
├── styles/                       # maguey-theme.js (SINGLE SOURCE OF TRUTH), token scss, styles.scss
└── environments/                 # environment.ts (url, theme)
```

### 1.3 Feature module anatomy (the repeating unit)

Each feature is a folder under `src/app/modules/<feature>/` containing:

```
<feature>/
├── <feature>.routing.ts          # Routes[] exported, lazy-loaded from app.routing.ts
├── <feature>.service.ts          # HTTP service extending HttpHelpersService
├── <feature>.component.ts/.html  # list/main screen (signals + OnPush)
├── <feature>.component.spec.ts   # Jest unit test (co-located, mandatory)
└── <sub-feature>/                # create-modal, item-detail, charts, etc.
```

Models live centrally in `src/app/modules/shared/interfaces/*.model.ts` (not per-feature). Path aliases: `@app/*`, `@shared/*` (→ `modules/shared`), `@maguey/*`, `@root/*`.

### 1.4 Routing — lazy, guarded, hash-based

- `app.routing.ts`: two shells via one `LayoutComponent` — `data: {layout: 'compact'}` for the app (guarded by `authGuardFn`), `data: {layout: 'empty'}` for `authentication/*`.
- Every feature is `loadChildren: () => import('./modules/x/x.routing').then(m => m.XRoutes)`.
- `provideRouter(appRoutes, withPreloading(PreloadAllModules), withHashLocation())` — **hash location** (`/#/dashboard`), all lazy chunks preloaded after boot.
- Route `data: { title }` drives the page title (`TitleService`); `data: { expectedRole }` drives `roleGuardFn`.

### 1.5 Naming & lint conventions

- Component selectors: prefixes `app-`, `mg-`, `auth-` (kebab). Directives: `app` (camelCase). Enforced by `eslint.config.js`.
- ESLint flat config enforces: `prefer-inject`, `prefer-on-push-component-change-detection`, `prefer-standalone`, no-empty-lifecycle. TS strict is on but `no-explicit-any`/`non-null-assertion` are relaxed (legacy).
- All user-facing text is **Spanish (es_MX)**. `LOCALE_ID: 'es-MX'`, date-fns `es` adapter, weeks start Sunday.
- Commit prefixes: `feat:`, `fix:`, `refactor:`, `chore:` (with emoji). Husky + lint-staged run `eslint --fix` on commit.

---

## 2. Design System — "Agave 2.0" (CRITICAL for Nabani)

### 2.1 Does it implement the `mg-*` component system? — Partially, and deliberately so

**Answer:** There is **no** `mg-card`, `mg-btn`, `mg-field`, `mg-table`, `mg-chip`, `mg-label` **CSS class** or component. Those exist only in the **static handoff mockups** (`docs/design_handoff_maguey/shared/maguey.css`, header literally reads `AGAVE 2.0 — Maguey design tokens + components`, with `.mg-card`, `.mg-shell`, `.mg-side` classes). In the **production Angular app** those were re-expressed as:

1. **Token-based Tailwind utilities** for cards/buttons/fields/tables (`bg-card`, `rounded-card`, `border-line`, `text-ink`, etc. — a card is just `class="bg-card rounded-card"`).
2. **A library of `mg-*` Angular presentational components** for the pieces that need logic/variants.

The `mg-*` **components that DO exist** (in `src/app/modules/shared/components/`):

| Selector | File | Purpose |
|---|---|---|
| `<mg-pill>` | `pill/pill.component.ts` | Unified badge — 8 variants (`tint/neutral/solid/teal/rose/amber/outline/brand`), 2 sizes, optional color dot |
| `<mg-tile>` | `tile/tile.component.ts` | Color-tinted icon tile (accounts, categories) with `--tc` custom color |
| `<mg-dot>` | `dot/dot.component.ts` | 7px color dot (accompanies every account/method/tag everywhere) |
| `<mg-modal-shell>` | `modal-shell/` | Dialog chrome: brand header bar + scroll body + footer slots (`mgModalInfo`, `mgModalActions`) |
| `<mg-empty-state>` | `empty-state/` | Icon-in-circle + title + message + CTA `<ng-content>` |
| `<mg-pager>` | `pager/` | Compact server-side paginator (replaces `mat-paginator`) |
| `<mg-skeleton>` / `<mg-row-skeleton>` | `skeleton/` | Shimmer loading placeholders |
| `<mg-compact-select>` | `compact-select/` | 32px custom select — a **CVA over CDK Overlay** (not Material), keyboard-navigable |
| `<mg-transaction-row>` / `<mg-date-row>` | `transaction-row/` | The canonical list row: `grid-cols-[42px_1fr_auto]`, tile + rid + title + meta slot + amount + actions slot |
| `<mg-ccard>` | `ccard/` | CSS credit-card visual (gradient from method color) |
| `<mg-color-swatches>` | `color-swatches/` | 16-color muted palette picker |
| `<app-date-range-filter>` | `date-range-filter/` | Preset date ranges (Este mes / 3 meses / …) |

Plus **engine** `mg-*` components (from Fuse) in `src/@maguey/components/`: `<mg-vertical-navigation>` (+ basic/aside/collapsable/group/divider/spacer items), `<mg-alert>`, `<mg-loading-bar>`, `<mg-splash-screen>`.

**Component skeleton** (this is the exact shape to copy for Nabani DS components):

```typescript
// pill.component.ts — signal inputs + HostBinding, OnPush, standalone
@Component({
  selector: 'mg-pill',
  template: `@if (showDot) { <span class="dot"></span> }<span class="tx"><ng-content></ng-content></span>`,
  styleUrl: './pill.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class PillComponent {
  readonly variant = input<PillVariant>('neutral');
  readonly size = input<PillSize>('base');
  readonly color = input<string>();
  @HostBinding('class') get hostClasses() { return `${this.variant()} ${this.size() === 'sm' ? 'sm' : ''}`; }
  @HostBinding('style.--pc') get pillColor() { return this.color() || null; }
}
```

### 2.2 Design tokens — one source, three consumers (read THEME.md)

**Single source of truth:** `src/styles/maguey-theme.js` (schemes, constants, muted palette, `magueyCustomProps`).

It feeds three consumers:
1. `src/styles/maguey-theming.tailwind.js` — Tailwind `addBase` plugin, emits CSS variables as **RGB triplets** (`"28 32 30"`) into `:root` (light) and `body.dark` / `.dark` (dark). Triplets so both `rgb(var(--x) / alpha)` and Tailwind's `<alpha-value>` work.
2. `tailwind.config.js` — maps those variables to utilities: `bg-canvas`, `bg-card`/`bg-surface`, `text-ink`/`text-ink-2`/`text-ink-3`, `border-line`/`border-line-strong`, `brand`/`brand-tint`, `gold`, `teal`, `rose`, `amber`, plus the 8-color `earth` chart palette and 16-color `user` muted palette. Radii: `rounded-card` 12, `rounded-btn`/`rounded-field` 10, `rounded-compact` 8.
3. `src/@maguey/styles/themes.scss` — wires Angular Material 22's `--mat-sys-*` system tokens **from** the `--maguey-*` variables at runtime, so Material dialogs/menus/buttons flip in dark automatically. (The old M2 Sass theme maps were removed — Material 22 ignored them, which broke dark mode after v22; fixed in `6c219a1`.)

**Token cheat-sheet (light → dark)** from `maguey-theme.js` / THEME.md §2:

| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | `#F8F9FA` | `#141715` | page bg |
| `card` | `#FFFFFF` | `#1C201E` | cards, modals |
| `ink / ink-2 / ink-3` | `#17201B / #4E5A54 / #7C8680` | `#ECEFED / #A9B1AD / #788079` | primary / secondary / meta text |
| `line / line-strong` | `#E7EAE8 / #D8DDDA` | `#2A2F2C / #39403C` | dividers / input borders |
| `brand` (constant) | `#2A4C3C` | same | brand green, sidebar in both modes |
| `gold` (constant) | `#E1B66B` | same | ONLY active nav + one hero amount/view |
| `teal` (constant) | `#0D9488` | same | ONLY `+` amounts |
| `rose` (constant) | `#E11D48` | same | ONLY subtraction/debt/destructive |
| `amber-bright` | `#F59E0B` | same | ONLY notification dot / budget alert bars |

The **16 muted user colors** (Marino, Teja, Bosque, …) are for user-picked account/method/tag/category colors — mid-saturation so they read on both schemes. Legacy DB hex is remapped on the fly by `toMutedColor()` (`@shared/services/maguey-palette.ts`) at data-load time, never migrated.

### 2.3 Utility vocabulary — the rule for app code

App code uses the **token utilities**; the Maguey-prefixed ones are reserved for `src/@maguey/`. Key rules (THEME.md §3):

- Page bg → `bg-canvas`. Card → `bg-card` (triggers a **global border hack** in `styles.scss`: `.bg-card { border: 1px solid rgb(var(--maguey-line)) }`) or `bg-surface` (same color, no border).
- Text → `text-ink` / `text-ink-2` / `text-ink-3`. Borders → `border-line` / `border-line-strong` / `divide-line`. Focus ring → `ring-brand/15` (3px).
- **Never write `dark:` in app code.** The flip is done by CSS variables. A `dark:bg-…` in a feature means something is modeled wrong.
- **fontSize trap:** the Tailwind scale is customized (`text-sm`=12px, `text-base`=14px). Handoff recipes assume default scale → port with **arbitrary px** (`text-[14px]`, `text-[23px]`).

### 2.4 Dark mode mechanics

`ThemeService` (`src/app/core/theme/theme.service.ts`) holds scheme `'light' | 'dark' | 'auto'` in a signal, persisted to `localStorage['scheme']`, default `'auto'` (respects `prefers-color-scheme`). It writes `MagueyConfigService.config.scheme`; the layout toggles the `dark` class on `<body>`; CSS variables redefine → everything tokenized flips. UI: a "Tema" row in the user menu + a quick moon/sun toggle.

**Theme-independent zones** (do NOT flip): the sidebar (always brand `#2A4C3C`, active item gold), modal scrim, ccard gradient, muted palette, earth chart palette.

**Body-portal rule (overlays):** anything portaled out (ng-select `appendTo=body`, CDK overlays, mat panels, dialogs, toasts, ApexCharts tooltips) can't inherit nested selectors — style with **top-level token selectors** (see `custom-ng-select.scss`, `overrides/angular-material.scss`).

### 2.5 How a screen is composed (from `incomes.component.html`)

```html
<div class="flex flex-col flex-auto w-full">
  <div class="flex flex-col w-full max-w-screen-xl mx-auto p-4 sm:p-6 md:p-8">   <!-- canonical page container -->
    <!-- header -->
    <h1 class="text-[23px] font-bold text-ink">Ingresos</h1>
    <button mat-flat-button color="primary" (click)="openCreateIncome()">…</button>

    @if (empty) {
      <div class="bg-card rounded-card">
        <mg-empty-state icon="…" title="…" message="…"><button mat-stroked-button>…</button></mg-empty-state>
      </div>
    } @else {
      <!-- stat tiles: bg-card rounded-card + text-teal tabular-nums -->
      <!-- filters: <app-date-range-filter> + <mg-compact-select> -->
      <div class="bg-card rounded-card overflow-hidden">
        <div class="flex … border-b border-line px-5"> <h2>…</h2> <mg-pager …/> </div>
        @if (!isDataLoaded()) { @for (i of [1,2,3,4,5,6]; track i) { <mg-row-skeleton/> } }
        @else {
          <div class="divide-y divide-line">
            @for (income of incomes(); track income.id) {
              <mg-transaction-row [noIcon]="true" [rid]="'INC-'+income.id" [title]="income.concept"
                [amount]="'+' + (income.totalAmount | currency:'MXN':'symbol-narrow')" amountTone="in">
                <ng-container mgRowMeta>…<mg-dot [color]="income.accountColor"/>…</ng-container>
                <ng-container mgRowActions><button [matMenuTriggerFor]="incomeMenu">…</button></ng-container>
              </mg-transaction-row>
            } @empty { <mg-empty-state …/> }
          </div>
        }
      </div>
    }
  </div>
</div>
```

The **canonical page container** `flex flex-col w-full max-w-screen-xl mx-auto p-4 sm:p-6 md:p-8` is used on **every** screen (a closed handoff decision). Amounts always carry `tabular-nums`; record IDs (`INC-474`) are in `font-mono` inside the row title.

---

## 3. State & Data

### 3.1 HTTP service pattern

All services extend `HttpHelpersService` (`@shared/services/httpHelpers.service.ts`) which supplies `API_URL = environment.url` and `createHttpParams(query)` (drops null/undefined/empty). They `inject(HttpClient)` and return `Observable`s.

**Service skeleton** (from `incomes.service.ts` — copy this for Nabani):

```typescript
@Injectable({ providedIn: 'root' })
export class IncomesService extends HttpHelpersService {
  private http = inject(HttpClient);

  getIncomes(query: Query): Observable<RecordsList<IIncome>> {
    const params = this.createHttpParams(query);
    return this.http.get<RecordsList<IIncome>>(`${this.API_URL}/incomes`, { params }).pipe(
      map(r => ({ ...r, rows: r.rows?.map(i => ({ ...i, accountColor: toMutedColor(i.accountColor) })) }))
    );
  }
  saveIncome(dto: IncomeDTO)  { return this.http.post<IIncome>(`${this.API_URL}/incomes`, { ...dto }); }
  updateIncome(id, dto)       { return this.http.put(`${this.API_URL}/incomes/${id}`, { ...dto }); }
  deleteIncome(id: number)    { return this.http.delete(`${this.API_URL}/incomes/${id}`); }
}
```

List endpoints return `RecordsList<T>` = `{ rows: T[], count: number }` for server pagination.

### 3.2 Signals vs RxJS

- **RxJS** at the HTTP boundary only (services return Observables; components `.subscribe()`).
- **Signals** for all component state: `signal()` for data, `computed()` for derived (e.g. `accountOptions` from `accounts()`), `.update(p => ({...p, offset: 0}))` for pagination.
- No global store (NgRx/etc.). State is component-local signals + `providedIn: 'root'` services. For complex features the guide documents an optional **two-service pattern** (see §5.4) — an API service (HTTP) + a state service (signals with `.asReadonly()` exposures) — but most features use a single service + component signals.
- **The Golden Rule (ANGULAR-PATTERNS-GUIDE.md):** always wait for the server response before mutating signals. On create, add the server object (with real ID); on delete, remove after confirm. Never optimistic-update, never call `loadItems()` after you already have the data.

### 3.3 Forms bridged to signals (zoneless)

Reactive forms are used with `FormBuilder`, but template state reads go through signals:

```typescript
private readonly formEvents = toSignal(this.form.events);          // built in a FIELD INITIALIZER
readonly formValue   = computed(() => { this.formEvents(); return this.form.getRawValue(); });
readonly formInvalid = computed(() => { this.formEvents(); return this.form.invalid; });
```

`[formGroup]`/`formControlName` bindings stay normal; only READS are bridged.

### 3.4 API base URL & environment

`src/environments/environment.ts`: `{ production, url: 'http://localhost:4040/api', theme: 'theme-maguey' }`. Swapped for `environment.prod.ts` at prod build via `angular.json` fileReplacements. `HttpHelpersService.API_URL` reads `environment.url`.

---

## 4. Auth

`src/app/core/auth/` — four files, one concern each:

- **`auth.service.ts`** (`providedIn: 'root'`, extends `HttpHelpersService`): login/signup/refresh/reset/verify/changePassword/logout HTTP calls. Tokens + roles + username + `expiresIn` stored in **`localStorage`**. Exposes `isAuthenticated = signal(false)` (seeded from stored token/refresh-token/expiry). Roles helpers: `isAdmin()`, `userHasRole(role)`; roles are normalized from legacy string/JSON-string/array shapes.
- **`token-interceptor.service.ts`** (`HttpInterceptor`, registered via `HTTP_INTERCEPTORS` multi in `app.config.ts`): attaches `Authorization: <token>` header; on **401** (non-auth URL) it runs a **single-flight refresh** — a `BehaviorSubject<string|null>` queues concurrent requests, refreshes once via `/auth/refresh`, retries; on refresh failure it calls `logout()`.
- **`auth-guard.service.ts`** — functional `authGuardFn`: redirects to `/authentication/login` if `!isAuthenticated()`. Applied per-route as `canActivate: [authGuardFn]`.
- **`role-guard.service.ts`** — functional `roleGuardFn`: reads `route.data['expectedRole']`, redirects to `/dashboard` if the user lacks it.

**Role-based UI gating:** `authService.isAdmin()` / `userHasRole()` gate template sections and nav items. Login flow: `login()` → `setUser(token, refreshToken, roles, expiresIn, username, fullname)` sets `isAuthenticated` → route to dashboard.

---

## 5. Feature Examples (templates to copy)

### 5.1 Incomes — the clean "list + stats + filters + pager + create-modal" template

- `incomes.routing.ts`: `{ path: 'list', component: IncomesComponent, data: { title: 'Ingresos' } }`.
- `incomes.service.ts`: CRUD + `getIncomeStats()` (see §3.1).
- `incomes.component.ts`: OnPush, all `inject()`. State: `incomes = signal<IIncome[]>([])`, `pagination = signal(paginationService.getDefaultPagination())`, `accounts`, `selectedAccountId`, `startDate/endDate`, `stats`, and `accountOptions = computed<MgSelectOption[]>(...)`. `loadData()` builds a query from signals and `.set()`s results. Create/edit open `CreateIncomeComponent` via `MatDialog` (`width: '460px', disableClose: true`), reload on `afterClosed()`. Delete via `MagueyConfirmationService.open(...)`.
- Template: canonical container, stat tiles, `<app-date-range-filter>` + `<mg-compact-select>`, card with `<mg-pager>` header, `<mg-row-skeleton>` while loading, `<mg-transaction-row>` list with `mgRowMeta`/`mgRowActions` slots, `mat-menu` for row actions, `<mg-empty-state>` for empty/filtered-empty.

### 5.2 Create-Income modal — the `mg-modal-shell` + bridged-form template

`create-income/create-income.component.html` wraps everything in `<mg-modal-shell [title] (closed)>`, a `[formGroup]` body of label + `<mg-compact-select>` / `mat-form-field` (datepicker) / native inputs styled with `border-line-strong bg-surface focus-within:ring-brand/15`, error text in `text-rose`, and footer slots:

```html
<div mgModalInfo>…Total…</div>
<ng-container mgModalActions>
  <button mat-stroked-button (click)="closeDialog()">Cancelar</button>
  <button mat-flat-button color="primary" [disabled]="formDisabled()" (click)="save()">Guardar</button>
</ng-container>
```

### 5.3 Cash-Flow report — the signals + D3 Sankey + ApexCharts template

`src/app/modules/reports/cash-flow/` — a dedicated `services/cash-flow.service.ts`, a `sankey-chart/` D3 component, `compare-select/` + `compare-view/` for A/B mode, and `interfaces/cash-flow.model.ts`. State is all signals (`sankeyData`, `selectedCategory`, `selectedSubCategory`, `expenseItems`, `isLoading`, `error`). This is the reference for chart-heavy, drill-down screens.

### 5.4 Two-service pattern (documented, for complex features)

ANGULAR-PATTERNS-GUIDE.md §Service Layer Architecture prescribes, for complex features, splitting into `services/api/feature-api.service.ts` (HTTP only) and `services/state/feature-state.service.ts` (signals: `itemsSignal`, `loadingSignal`, `errorSignal`, `paginationSignal`, all exposed `.asReadonly()`, plus `computed` `isEmpty`/`hasItems`, and `loadItems/createItem/updateItem/deleteItem` following the Golden Rule with `takeUntilDestroyed(this.destroyRef)`).

---

## 6. Charts / Tables / Forms / Modals / Toasts

- **Charts:** ApexCharts via `ng-apexcharts` (`<apx-chart>`), plus **D3 + d3-sankey** for the cash-flow diagram. `ChartService` (`@shared/services/chart.service.ts`) holds default configs per type (`pie`/`bar`/`line`/`area`), a `CHART_CATEGORY_COLORS` earthy palette, custom HTML tooltips, and `mapXChartGraphicData()` mergers. Pie slice borders are stroked with the resolved `--maguey-card` hex (SVG can't read CSS vars). Grid/axis colors track `line`; the trend chart re-reads the var via `getComputedStyle` and rebuilds on scheme change (`effect` + `ThemeService.scheme`). Wrap charts in `@defer (on viewport)` with an `<mg-skeleton>` placeholder.
- **Tables:** two styles. (a) `<mg-transaction-row>` grids for financial lists (preferred, the design-system way). (b) `MatTable` with `class="w-full bg-transparent"` inside a `bg-card` wrapper for tabular data (articles/merchants). **Always** paginate with `<mg-pager>` (never `mat-paginator`; the old `server-table-pagination` lib was removed). Critical: keep the pager alive across reloads by gating it on `count > 0` and dimming with `opacity-50 pointer-events-none`, not by destroying it under an `@if (!loading)`.
- **Forms:** reactive `FormBuilder`, `appearance="fill"` Material fields OR the token-styled native-input pattern (label + `border-line-strong bg-surface focus-within:ring-brand/15`), plus `<mg-compact-select>` (CVA) for compact/color-dot selects and `@ng-select/ng-select` for virtual-scroll multi-selects. State bridged via `toSignal(form.events)`.
- **Modals:** `MatDialog.open(Component, { width, maxWidth: '100vw', disableClose: true, data })`. Content wrapped in `<mg-modal-shell>` (which uses `-m-6` to cancel MatDialog padding and `w-[calc(100%+3rem)]` to compensate). Full-viewport modals set `maxWidth/maxHeight: 100vw/100vh`.
- **Toasts:** `@ngxpert/hot-toast` — `inject(HotToastService)`, `toast.success('Creado exitosamente')` / `toast.error(...)` / `toast.info(...)`, all Spanish.
- **Confirmations:** `MagueyConfirmationService.open(dialogData)` (engine service) → `afterClosed()` returns `'confirmed'`. `CommonService.getDefaultDeleteConfirmation({ objectName })` builds standard delete dialogs.
- **Loading/splash:** engine `<mg-loading-bar>` (top, tracks concurrent HTTP), `<mg-splash-screen>` (boot), `<mg-skeleton>`/`<mg-row-skeleton>` shimmer.

---

## 7. Testing & Tooling

- **Unit tests: Jest** (`jest.config.js`, `jest-preset-angular`, jsdom). Co-located `*.spec.ts`. Path aliases mapped; `d3`/`d3-sankey` mapped to UMD builds; scss mocked. **Coverage thresholds are high and enforced:** statements 95 / branches 85 / functions 95 / lines 95. Models, routing, DI-wiring excluded from coverage. Run: `npm test`, `npm run test:watch`, `npm run test:coverage`.
- **E2E: Playwright** (`playwright.config.ts`, `e2e/`). Chromium, `baseURL localhost:4200`, auto-starts `npm start`. Suites: `auth`, `admin`, `dashboard`, `expenses-nav`, `family-*`, `reports`, `receipt-scan`, `dark-mode`, `smoke`, `domain-pages` + `fixtures/app.fixtures.ts`. Run: `npm run e2e` (`:ui`, `:headed`).
- **Lint: ESLint flat config** (`eslint.config.js`) with `angular-eslint` + `typescript-eslint`; enforces inject/OnPush/standalone/selector-prefix rules. `npm run lint` / `lint:fix`. Husky pre-commit runs lint-staged.
- **Guard test:** `src/styles/theme-drift.spec.ts` fails if a TS mirror of the palette drifts from `maguey-theme.js`, and forbids hex surface literals in `themes.scss`.
- **Build:** `npm start` (dev server, port 4200), `npm run build` (prod, output → `frontend/`). Budgets: initial 2.2mb warn / 2.6mb error. **Cache gotcha:** editing any `.js` required by `tailwind.config.js` (theme/plugins) doesn't invalidate `.angular/cache` — `rm -rf .angular/cache` and restart.

---

## 8. What Maps to Nabani (nutrition clinic)

The design system, engine, auth, layout, and all shared components are **domain-agnostic and directly reusable**. Only the finance-specific feature modules need replacing. Reuse map:

### Reuse as-is (rename nothing / rename only labels)
- **Entire `src/@maguey/` engine** — navigation, alert, loading-bar, splash, confirmation, config, media-watcher, Tailwind plugins.
- **Entire design token system** — `maguey-theme.js` + the three consumers + THEME.md rules. (Keep the green brand or reskin — a nutrition clinic reads well in the same calm green/gold. Changing brand = edit `maguey-theme.js` constants only.)
- **All `mg-*` DS components:** `mg-pill`, `mg-tile`, `mg-dot`, `mg-modal-shell`, `mg-empty-state`, `mg-pager`, `mg-skeleton`/`mg-row-skeleton`, `mg-compact-select`, `mg-transaction-row`/`mg-date-row`, `mg-color-swatches`, `app-date-range-filter`. These cover ~80% of any list/table/form/modal screen.
- **Core plumbing:** auth service + guards + token interceptor (JWT refresh flow), `ThemeService`, `HttpHelpersService`, `PaginationService`, `ChartService`, `CommonService`, `TitleService`, layout shell (compact sidebar + topbar + user menu).
- **Tooling:** Jest/Playwright/ESLint/Husky configs, path aliases, `RecordsList<T>` pagination contract.

### Rename / re-skin existing screens for Nabani
| Maguey screen | Nabani analog |
|---|---|
| Incomes list (flat rows + stats + pager) | **Patients list**, appointments list, invoices |
| Expenses list (grouped-by-date rows + category chart + filters) | **Consultations / visits** grouped by date; **food/diet log** grouped by day |
| Expense create modal (line-item manager) | **Meal-plan builder** (food line-items: food, qty, kcal, macros) |
| Cash-flow Sankey report | **Nutrient/macro flow** or **calorie-source breakdown** report |
| Dashboard (account cards + pie + trend) | **Patient dashboard**: weight/BMI trend, adherence donut, next appointments |
| Admin — Categories/Tags | **Food categories**, diagnosis/condition tags, plan templates |
| Admin — Accounts/Payment methods (color tiles + ccard) | **Clinicians / rooms**, membership/billing cards |
| Family (members, invite, shared spending, budgets) | **Household / patient groups**, shared meal plans, goal budgets (calorie/macro targets) |
| Inventory — Articles/Merchants (paginated CRUD tables) | **Food database / supplements** and **suppliers/labs** |
| Receipt scan (OCR + fuzzy match wizard) | **Food-label / lab-result scan** (same 3-step capture→process→review wizard) |
| Profile + auth suite | reuse directly (Nabani users, roles: `admin`, `nutritionist`, `patient`) |

### Concrete Nabani build recipe (per feature)
1. Add `patients/` module: `patients.routing.ts` (lazy, guarded), `patients.service.ts` (extends `HttpHelpersService`, `RecordsList<IPatient>`), `patients.component.ts` (OnPush, signals, `computed` options), models in `shared/interfaces/patient.model.ts`.
2. Register the lazy route in `app.routing.ts` and a nav item in `navigation.menu.data.ts`.
3. Compose the screen from the canonical container + `mg-*` components + token utilities (§2.5).
4. Modals via `MatDialog` + `mg-modal-shell` + bridged reactive form.
5. Toasts (`HotToastService`), confirmations (`MagueyConfirmationService`), pager (`mg-pager`), empty/skeleton states.
6. Co-locate `*.spec.ts` (Jest, ≥95% target) + add a Playwright flow.

**Bottom line for Nabani:** the design-system, engine, auth, and shared-component layers are production-ready and directly reusable — Nabani inherits a coherent, dark-mode-capable, token-driven UI kit on day one. The work is almost entirely (a) swapping the domain models/services/screens from finance to clinical nutrition, and (b) optionally editing brand constants in `maguey-theme.js`. Reusing the shared building blocks, an estimated 70–85% of Nabani's UI can be assembled from existing maguey components without new CSS.
