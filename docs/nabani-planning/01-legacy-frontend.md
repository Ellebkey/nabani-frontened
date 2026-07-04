# Legacy Frontend Analysis — Nutrivera / "MiPlan" (Angular 9)

> Source repo: `/home/jbarranco/Proyectos/nutrivera/nutrivera-refactor`
> Purpose of this document: capture the **current** implementation of the legacy Angular 9 SPA so a team can rebuild it in a modern stack. Nothing in the repo was modified.
>
> App identity: package name `my-expenses` (v1.6.2), Angular project name `nutrivera`, browser title **"MiPlan - Nutrivera"**. It is the front office / back office for a **nutrition clinic + meal-prep (tupper) delivery business**. UI language is **Spanish (es-MX)**.

---

## 1. App Overview & Tech Stack

### Framework & tooling
| Concern | Value |
|---|---|
| Framework | **Angular 9.0.1** (CLI 9.0.2, `@angular-devkit/build-angular` 0.900.2) |
| Language | TypeScript **3.7.5** |
| Template engine | **Pug** (`.pug`) via `ng-cli-pug-loader` + `pug-loader`; wired by `ng-add-pug-loader.js` (a `postinstall` hack that patches Angular's webpack config). A handful of templates are plain HTML (`register`, `account-setting`, `faq`, `404`, `500`, layouts). |
| Styling | **SCSS** + **Bootstrap 4.4.1**. Global entry `src/assets/scss/app.scss` pulling a large theme system under `src/assets/scss/` (elements, plugins, common, apps). This is a **purchased admin template** ("Ela Admin"-style) skinned for Nutrivera. |
| Icons/fonts | Themify Icons, Font Awesome, a custom `ei-icon`/`exclusive-icon` font (`src/assets/css/*`). |
| Routing strategy | `useHash: true` (hash-based URLs, e.g. `/#/dashboard`), `scrollPositionRestoration: 'enabled'`. |
| i18n | **None** — `@angular/localize` is installed and `LOCALE_ID` is fixed to `es-MX` (for currency/date pipes only). All UI strings are hardcoded Spanish. |
| Module system | Classic **NgModules** with lazy-loaded feature modules. No standalone components, no signals. |
| State | Service-based + RxJS; no NgRx/Akita store. |

### Key runtime libraries (`package.json`)
| Library | Version | Use |
|---|---|---|
| `@ng-bootstrap/ng-bootstrap` | 6.2.0 | Modals (`NgbModal`), datepicker, nav/tabs |
| `@ng-select/ng-select` | 4.0.4 | All dropdowns / multi-selects (virtual scroll) |
| `@fullcalendar/angular` (+daygrid, interaction) | 5.6.0 | Patient package calendar |
| `@swimlane/ngx-charts` | 17.0.0 | Dashboard + finance charts |
| `sweetalert2` | 9.7.2 | Confirm/alert dialogs (destructive actions) |
| `ngx-toastr` | 10.1.0 | Toast notifications |
| `ngx-perfect-scrollbar` | 7.2.1 | Scroll areas |
| `date-fns` | 2.21.1 | Date math (newer code) |
| `moment` + `angular2-moment` | 2.24 / 1.9 | Installed, **not actually imported** in `src/app` (dead dep) |
| `lodash` | 4.17.21 | Used in 2 menu components (`_.orderBy`, `_.includes`) |
| `jquery` 3.4.1, `popper.js`, `bootstrap` JS | — | Loaded as global scripts (Bootstrap dropdowns) |
| `@angular/cdk` | 11.1.2 | **Version-mismatched** with Angular 9 core |
| Installed-but-unused / template leftovers | `ng2-charts`, `ng2-nvd3`, `ng2-dragula`, `ng2-nouislider`, `nouislider`, `ngx-masonry`, `ng2-sticky-kit`, `ng2-scroll-to`, `ng2-toasty`, `ng2-validation`, `ng2-scroll-to`, `imagesloaded`, `pace-js`, `summernote`, `rxjs-compat`, `querystring` | various | Mostly dead weight from the admin template; a few (`ng2-sticky-kit`, `ng2-scroll-to`) are actually used in menu builders |

### Build config (`angular.json`)
- Single project `nutrivera`, `outputPath: dist/nutrivera`, default component style SCSS, prefix `app`.
- Global styles: pace, toastr, sweetalert2, ng-select theme, perfect-scrollbar, `app.scss`.
- Global scripts: **`pace.min.js`, `jquery.js`, `popper.min.js`, `bootstrap.js`** (jQuery + Bootstrap JS injected globally).
- Prod: `environment.prod.ts` swap, buildOptimizer, output hashing, budgets (2 MB warn / 5 MB error initial).
- `npm start` → `ng serve --o --port 3300`.

### Environments (`src/environments/`)
- Dev API: `http://localhost:31856/api`
- Prod API: `https://apinutrivera.joelbarranco.io/api`
- The single `environment.url` is the **only** backend base URL; every service reads it.

---

## 2. Routing & App Structure

### Two shells (`src/app/app.routing.ts`)
The root route uses two layout components:
- **`CommonLayoutComponent`** (`src/app/common/common-layout.component.*`) — the authenticated app shell: `<app-side-nav>` + `<app-header>` + `<app-side-panel>` + `<router-outlet>`.
- **`AuthenticationLayoutComponent`** (`src/app/common/authentication-layout.component.*`) — bare shell for login/register (template is effectively empty; children render full-screen).

Default redirect: `'' → dashboard`.

### Route map
| Path | Module (lazy) | Guards | Notes |
|---|---|---|---|
| `dashboard` | `DashboardModule` | `AuthGuard` | Home |
| `menus` | `MealMenusModule` | `AuthGuard` | Core domain |
| `pacientes` | `CustomersModule` | `AuthGuard` | Patients |
| `finanzas` | `FinancesModule` | `AuthGuard` + `RoleGuard` `['admin','staff']` | |
| `recursos-humanos` | `HumanResourcesModule` | `AuthGuard` + `RoleGuard` `['admin','staff']` | |
| `extras` | `ExtrasModule` | `AuthGuard` | Account/reset-password/FAQ |
| `authentication` | `AuthModule` | none | Login/register/404/500 |

### Feature sub-routes
**Meal-menus** (`meal-menus.routing.ts`): `listado`, `crear`, `editar/:menuId`, `calorias/:menuId`, `ingredientes`, `autorizar`, `crear/pacientes`, `editar/pacientes/:dailyId/:menuDay/:personId`, `mapa-de-produccion`, `etiquetas-entrega`.

**Customers** (`customers.routing.ts`): `listado`, `calendario/:customerId`, `detalle/:customerId`, `consultas/:customerId`, `venta/:saleId`.

**Finances** (`finances.routing.ts`): `ingreso-diario`, `gastos`, `cobranza`, `balance-general`, `paquetes`.

**Human-resources** (`human-resources.routing.ts`): `empleados`, `historial-de-nomina`, `usuarios-plataforma`.

**Auth** (`auth.routing.ts`): `login`, `register`, `500`, `404`.

**Extras** (`extras.routing.ts`): `account-setting`, `faq`, `reset-password`.

### Module list under `src/app`
`AppModule` (root) · `AuthModule` · `DashboardModule` · `MealMenusModule` · `CustomersModule` · `FinancesModule` · `HumanResourcesModule` · `ExtrasModule` · `SharedModule` (declares `TablePaginationComponent`, `LoadingSpinnerComponent`; re-exports Common/Forms/NgbModule/PerfectScrollbar/Toastr) · `TemplateModule` (header, side-nav, side-panel, footer). **~64 components total.**

### Side navigation (`src/app/template/side-nav/side-nav.component.pug`)
Menu groups: **Dashboard**, **Menús** (Ingredientes, Catálogo Menús, Autorizar Menús, Crear Menú por paciente, Mapa de producción, Etiquetas de paciente), **Pacientes** (Listado), **Finanzas** (Ingresos Diarios, Gastos, Cobranza, Balance General, Paquetes), **R.H.** (Empleados, Historial de Nómina, Usuarios).

---

## 3. Feature Inventory

### 3.1 Dashboard (`src/app/dashboard/`)
Landing screen with three cards. Loads via `DashboardService`:
- **Pacientes** — pie chart Activos vs Inactivos (`GET /count-people`).
- **Pagos Próximos** — upcoming receivables list, links to Cobranza (`GET /next-payments`).
- **Vencimientos próximos** — patients whose package is expiring, links to their calendar (`GET /expire-packages`).
- Note: `dashboard.service.ts` also has `getDashboardInfo` → `GET /dashboard`, but `DashboardComponent` doesn't call it.

### 3.2 Patients / "Pacientes" (`src/app/customers/`)
The clinical CRM.
- **`customers-list`** — paginated/searchable patient table; status filter (Activos/Inactivos); row actions route to detail, calendar, consultas, or open create / "vender día" modals. Suspend/reactivate via `changeCustomerStatus` (SweetAlert confirm).
- **`customer-creation`** (modal) — full "Nuevo paciente" reactive form (general info, address, food preferences, initial body-measurement evaluation, diseases, calorie/portion profile). Hardcodes `role: 'patient'`.
- **`customer-details`** — full-page edit of an existing patient (same fields minus the one-time body-measurement evaluation).
- **`customer-appointment`** ("Consultas") — records consultation sales (`type: 'Consulta'`, `paymentType: 'D'`).
- **`customer-individual-day`** (modal, "Vender día") — sells a single package day; picks a product, auto-fills price, posts a one-day `Sale` (`type: 'Package'`).
- **`customer-packages`** ("Paquetes/Calendario") — **FullCalendar** month view of a patient's generated delivery days + a searchable day list; clicking a day opens its detail modal; "+" opens Add-Package.
- **`customer-day-details`** (modal) — single daily-income status (Pagado / Autorizado / Menú) with **cancel** (`POST /cancel-daily-income`, shifts to next valid day) or **delete** (`DELETE /daily-incomes/:id`).
- **`add-new-package`** (slide-in modal) — **the package pricing engine** (see §8).
- **`customer-sale-detail`** — full-page sale editor: change total (redistributes across payments/days), delete individual payments, delete the whole sale.

### 3.3 Menus / "Menús" (`src/app/meal-menus/`) — CORE DOMAIN
Two layers: **template menus** (reusable daily menus per calorie level) and **per-patient personalized menus**, then **production/authorization/delivery** tooling.

- **`ingredients-list`** (+ `ingredient-create`/`ingredient-edit` modals) — ingredient catalog with a `groupName` (Fruta, Verdura, Cereal, Condimento, Semillas, Queso, Embutido, Proteína, Carne, Preparado, Otros) and **7 disease flags** (hipertensión, diabetes, colesterol, triglicéridos, colitis, gastritis, embarazo/lactancia).
- **`meal-menus-list`** — catalog of template day-menus; each card shows the 5 meals (Desayuno / Snack 1 / Comida / Snack 2 / Cena) with their ingredients (`name - size unit`). Search by text OR date.
- **`menu-create` / `menu-edit`** (+ `menu-meal-section`) — build/edit a template day-menu: 5 meal names (sticky left panel with scroll-to anchors) + per-meal ingredient picker with **Cantidad (size)**, **Medida (unit: pzas/ml/gr)**, and up/down **reorder** (array swap, not drag-and-drop). Create/update always redirects to the calorie config.
- **`menu-calorie-portions`** (+ `menu-calorie-item`) — "Menús por Calorías": for **each calorie level (kcal)**, set the **portions** of each ingredient in each meal. This is the kcal-level × meal × ingredient → portions matrix.
- **`menu-authorization`** ("Autorizar Menús") — for a delivery date, two lists: authorized days (can suspend) vs suspended/not-authorized days (can authorize); bulk select + confirm. Gates what actually gets produced.
- **`menu-production-map`** (+ `meal-header-cell`, `meal-item-cell`, `meal-total-portions-cell`) ("Mapa de producción") — big CSS-grid spreadsheet **aggregating portions across all patients** for a date, with per-ingredient totals for the kitchen, gap stats (active patients missing a menu), tupper flags, per-patient edit/delete, and a crude print.
- **`menu-deliver-labels`** ("Etiquetas de Entrega") — printable per-patient delivery labels, color-coded by delivery zone, listing the 5 meals + boilerplate ("Bebidas libres", "30 min de Actividad Física").
- **`meal-menu-by-customer`** — the personalization engine:
  - `menu-create-on-customer` ("Crear Menú por paciente") — steps through patients needing a menu (`GET /next-person-for-menu`), builds each menu honoring preferences/diseases, or bulk auto-generates conflict-free menus (`GET /create-default-menus`).
  - `menu-edit-on-customer` — edit one patient's existing daily menu (`GET /edit-person-for-menu`).
  - `meal-menu-section-on-customer` — per-meal editor enforcing **preferences (hard block)** and **diseases (soft warn)**, ingredient substitution, `(vacio)` placeholders for removed template items, color-coded conflict rows.
  - `menu-customer-details` — read-only patient sidebar (preferences, package meal inclusion, diseases, calorie/portion table).

### 3.4 Finances / "Finanzas" (`src/app/finances/`)
- **`daily-incomes-list`** ("Ingresos Diarios") — read-only daily cash-flow report with date range + grand total (`GET /daily-incomes`).
- **`expenses-list`** (+ create/edit modals) ("Gastos") — CRUD expenses; filter by beneficiary (company) + date range; type **Fijo/Variable**; company `ng-select` supports add-new.
- **`customer-payment-list`** ("Cobranza") — **accounts-receivable / collections**: pending customer payments; "Pagar" marks as settled (`PUT /payments/:id` → `paymentStatus:true`), "Eliminar" deletes. Cadence badges Semanal(S)/Quincenal(Q)/Mensual(M).
- **`resume-expenses-incomes`** ("Balance General") — dashboard of 3 ngx-charts widgets:
  - `incomes-resume` — income by package type (`GET /incomes-packages`, number-card).
  - `expenses-resume` — expenses by type (`GET /expenses-type`, advanced-pie).
  - `earnings-resume` — incomes vs expenses vs **Ganancia = Ingresos − Gastos** (`GET /revenue-by-day`, area chart + 3 KPI tiles). Defaults to current month.
- **`products-list`** (+ create/update modals) ("Paquetes") — package catalog: price-per-day, consult price, **discount fields (monthly/couple/especial)**, and 5 meal-inclusion booleans.

### 3.5 Human Resources / "R.H." (`src/app/human-resources/`)
- **`employees-list`** (+ create/update/create-payment modals) — employee CRUD with general info, address, and a **Salary** group (quincenal amount, role, optional "create user"). Soft delete (`DELETE /people/:id?recordStatus=false`).
- **`employee-create-payment`** ("Pagar Nómina") — pays payroll; **persisted as an Expense** with `type: 'Nomina'` linked to the person (`POST /expenses`).
- **`employees-payments`** (+ `employee-payment-edit`) ("Historial de Nómina") — payroll history report (reads `GET /expenses-payments-employees`, edits/deletes via the **finances** expense endpoints — payroll and expenses share the same table).
- **`users-list`** ("Usuarios") — read-only list of platform login users (`GET /users`).

### 3.6 Auth & Extras
- **`login`** / **`register`** — reactive forms; on success store token + roles in localStorage → redirect to dashboard.
- **`reset-password`** (extras) — change password for the current username (`PUT /reset-password`).
- **`account-setting`**, **`faq`**, **`404`**, **`500`** — mostly static admin-template leftovers.

---

## 4. Data Models / Interfaces

Interfaces are thin and permissive (lots of `any`); most service methods return/accept `any`. The typed ones:

### Customer domain (`src/app/customers/customer.interface.ts`)
| Interface | Fields |
|---|---|
| `Customer` | `id, firstName, lastName, email, cellphone, number, gender, birthday, week, zone, tuppers, otherFood, programKnow, recordStatus, role, ingredients: Ingredient[], address: Address, calories: Calories, trackings: Tracking, diseases: Diseases` |
| `CustomerItem extends Customer` | + `customerName, lastDay, calorieNumber` (list view) |
| `Address` | `street, zone` (form also uses `neighborhood, numberExt, zipCode`) |
| `Tracking` | `weight` (form also: `height, age, bodyFat, weightFat, water, weightMuscle, back, arm, highWaist, abs, waist`) |
| `Diseases` | booleans: `diabetes, arterosclerosis, hipertension, infartos, tiroides, embarazo, lactante, colesterolemia, trigliceridos, osteoporosis, digestion, gastritis, colitis, estrenimiento, fibras, hidratacion, hormonas`; + `otros: string` |
| `Calories` | `name, vegetable, fruit, cereal, milk, breakfast, lunch, dinner, oil, seed, comments` (portion counts per food group/meal) |
| `Ingredient` | `id` |
| `CalendarEvent` | `id, allDay, amount, backgroundColor, display, start, status` |
| `Daily` | `id, amount, incomeDay, recordStatus` |
| `Sale` | `id, totalAmount, Dailies: Daily[]` |
| `Product` | `id, displayLabel, medicConsult, priceBuy, priceSell, monthDiscount, especialDiscount, coupleDiscount` |
| `DailyDetails` | `id, amount, authorized, hasMenu, incomeDay, recordStatus, saleId, Sale, Product` |

> Server naming note: payloads often capitalize associations (`Addresses`, `Trackings`, `Calories`, `Diseases`, `Preferences`, `Payments`, `Dailies`, `Items`, `Salary`) — a Sequelize-style association convention.

### Menu domain (`src/app/meal-menus/meal-menu.interface.ts`)
| Interface | Fields |
|---|---|
| `Ingredient` | `id, name` |
| `IngredientItem extends Ingredient` | `groupName` + disease flags `colesterol, colitis, diabetes, embarazo, gastritis, hipertension, trigliceridos` |
| `CustomerIngredient extends Ingredient` | `portions, position, size, unit` + UI flags `isNewIng, avoidSickness, avoidPreference, isEditing, status` |
| `Meal` | `name, number, type, originalName, translate, newMeal, ingredients: CustomerIngredient[], ingredientsTags: CustomerIngredient[]` |
| `Preferences` | `id, name` |
| `Sickness` | `keys: Preferences[]` |

Meal skeleton (fixed everywhere): `breakfast(0) / snack1(1) / lunch(2) / snack2(3) / dinner(4)` ↔ `Desayuno / Snack 1 / Comida / Snack 2 / Cena`.

### Finance domain (`src/app/finances/interfaces/`)
| Interface | Fields |
|---|---|
| `Expense` | `id, type, name, concept, expenseDate, details, totalAmount` |
| `Revenue` | `name, series: ChartDataItem[], total` |
| `ChartDataItem` | `value, name` |

### User domain (`src/app/user/user.model.ts`)
`UserModel { username, email, password }` · `CredentialsModel { username, password }`.

### Package pricing config (`src/app/customers/customer-packages/add-new-package/packageConfig.ts`)
- `weekTypes`: `LV`→20 days, `LS`→24 days, `LD`→28 days.
- `timeLaps.regular`: `S` Semanal, `Q` Quincenal, `M` Mensual. `timeLaps.especial`: `S` Semanal, `M` Completo.
- `dayTypes`: `1` = "Regular Mensual - 20 días", `2` = "Otro".

---

## 5. API Layer (Frontend ↔ Backend Contract)

Base URL: `environment.url` (`.../api`). Auth header injected on **every** request by `TokenInterceptorService` (`Authorization: <token>`, raw token, no `Bearer`). Read endpoints use `.toPromise()`; writes return `Observable`. Query objects are serialized to `HttpParams`.

### Auth (`auth.service.ts`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/signup` | Register |
| POST | `/auth/login` | Login → `{ token, roles, expiresIn, displayName, username }` |
| PUT | `/reset-password` | Change password |

### Customers (`customers.service.ts`)
| Method | Path |
|---|---|
| POST | `/people` (create patient) |
| PUT | `/people/:id` (update patient) |
| GET | `/people/:id` |
| GET | `/people` (list, query) |
| DELETE | `/people/:id?recordStatus=<status>` (status change) |
| GET | `/consult-data` (patient consultations) |
| GET | `/calendar-days/:customerId` |
| GET | `/daily-incomes/:dailyId` |
| GET | `/products?recordStatus=true` |
| POST | `/cancel-daily-income?dailyId=` |
| DELETE | `/daily-incomes/:dailyId` |
| POST | `/calculate-package-and-days` (server generates delivery days) |

### Meal menus (`meal-menus.service.ts`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/menus` | Template menu list |
| POST | `/menus` | Create template menu |
| PUT | `/menus/:id` | Update template menu |
| GET | `/menus/:id` | Get template menu |
| DELETE | `/menus/:id` | Delete |
| GET | `/menus-calories-config` | Calorie→portion config |
| POST | `/menus-calories-config` | Save calorie config |
| GET | `/ingredients` | Ingredient list |
| GET | `/ingredients/:id` | Get ingredient |
| POST | `/ingredients` | Create |
| PUT | `/ingredients/:id` | Update |
| DELETE | `/ingredients/:id` | Delete |
| GET | `/ingredients-for-menu` | Ingredients for menu builder |
| GET | `/customers-by-ingredients` | Patients by ingredient preference (used in header search) |
| GET | `/menus-for-authorize` | Authorization list |
| POST | `/menus-for-authorize` | Authorize/suspend days |
| GET | `/production-menus-labels` | Delivery labels |
| GET | `/production-menus-map` | Production map (aggregated) |
| POST | `/delete-menu-map` | Delete a patient's menu from map |
| GET | `/next-person-for-menu` | Next patient needing a menu |
| GET | `/edit-person-for-menu` | Load patient menu for edit |
| POST | `/person-menus` | Save per-patient menu |
| GET | `/create-default-menus` | Bulk auto-generate patient menus |

### Finances (`finances.service.ts`)
| Method | Path |
|---|---|
| POST | `/sales` · GET `/sales/:id` · DELETE `/sales/:id` |
| POST | `/change-amount-sale/` (redistribute sale total) |
| GET | `/daily-incomes` (list) |
| GET | `/expenses` · GET `/expenses/:id` · POST `/expenses` · PUT `/expenses/:id` · DELETE `/expenses/:id` |
| GET | `/expenses-companies` (beneficiary list) |
| GET | `/payments` · PUT `/payments/:id` · DELETE `/payments/:id` (cobranza) |
| GET | `/revenue-by-day` · GET `/expenses-type` · GET `/incomes-packages` (balance charts) |
| GET | `/products` · POST `/products` · GET `/products/:id` · PUT `/products/:id` · DELETE `/products/:id` |

### Human resources (`human-resource.service.ts`)
| Method | Path |
|---|---|
| GET | `/employees` (list) |
| POST | `/employees` (create) |
| GET | `/employee/:id` · PUT `/employee/:id` |
| DELETE | `/people/:id?recordStatus=false` (soft delete) |
| POST | `/expenses` (create payroll payment, `type:'Nomina'`) |
| GET | `/expenses-payments-employees` (payroll history) |
| GET | `/users` (platform users) |

### Dashboard (`dashboard.service.ts`)
| Method | Path |
|---|---|
| GET | `/dashboard` (defined, unused by component) |
| GET | `/count-people` |
| GET | `/next-payments` |
| GET | `/expire-packages` |

> **~55 distinct endpoints.** The backend is a REST API (host `apinutrivera.joelbarranco.io`) with Sequelize-style capitalized associations, string bearer-less tokens, and a `recordStatus` soft-delete convention.

---

## 6. Auth & Roles

- **Mechanism:** token stored in **`localStorage`** (`token`, `roles`, `expiresIn`, `displayName`, `username`). No refresh token. `isAuthenticated()` simply compares `now < expiresIn`.
- **Interceptor** (`token-interceptor.service.ts`): adds `Authorization: <token>` to every request; on **HTTP 401** it force-logs-out and redirects to `authentication/login`.
- **Guards:**
  - `AuthGuardService` — blocks unauthenticated users (redirect to login).
  - `RoleGuardService` — reads `route.data.expectedRole` and calls `auth.userHasRole()`; redirects to dashboard if not allowed. Applied to **finanzas** and **recursos-humanos** (`['admin','staff']`).
- **Roles referenced:** `admin` (Administrador), `staff` (Staff), `doctor` (Nutriólogo), `account` (Contador), plus `patient` (assigned to created customers). Employee form lists `admin/doctor/staff/account`.
- **Role gating in UI:** `SideNavComponent` sets `shouldRenderMenu = userHasRole(['admin'])` — but note the side-nav template renders all sections statically (the role flag is computed but not fully wired to hide items). The real enforcement is the route `RoleGuard`.
- **Inconsistency risk:** `auth.service.isAdmin()` expects `roles.role === 'admin'` (object), while `userHasRole()` iterates `roles` as an **array** of strings. The shape of `roles` from login is ambiguous/dual-interpreted — a porting hazard.

---

## 7. State Management

- **No store library.** State lives in components and a few singleton services.
- **`TemplateService`** (`shared/services/template.service.ts`) — UI shell state via `BehaviorSubject`s (`isSideNavCollapse`, `isSidePanelOpen`, `rtlActived`).
- **`SpinnerService`** (`common/loading-spinner/`) — a global spinner toggled via an `EventEmitter`-based show/hide (anti-pattern: `@Output` on a service).
- **HTTP services** (`CustomerService`, `MealMenuService`, `FinancesService`, `HRService`, `DashboardService`, `AuthService`) — `providedIn:'root'` but also frequently **re-provided at component level** (redundant, creates multiple instances).
- **RxJS usage:** mostly `.toPromise()` + `async/await`; `Subject`/`debounceTime`/`distinctUntilChanged` for search inputs (pagination component, patient calendar search, header ingredient search); `BehaviorSubject` for shell state; a shared `mealStatus: Subject` to broadcast "clear meal" from parent to child in the menu builder.
- **Component communication:** `@Input`/`@Output`, `NgbActiveModal` for modals, route params for IDs.

---

## 8. Notable Business Logic

### Package pricing & day generation (`add-new-package.component.ts` + `packageConfig.ts`)
The financial heart of the app. Flow:
1. Patient's `week` (`LV`/`LS`/`LD`) → `defaultDays` (20/24/28) and `weekSize` (5/6/7).
2. Choose a product → `dayPrice = product.priceSell`.
3. Choose day-type: **"Regular Mensual"** (quantity = defaultDays) or **"Otro"** (manual day count).
4. `subTotal = dayPrice × days`.
5. **`calculateTotal()` discount precedence (mutually exclusive):**
   - `paymentType === 'M'` (monthly) & not "ignore" → **monthly discount** (`product.monthDiscount%`).
   - else `coupleDiscount` → `product.coupleDiscount%`.
   - else `especialDiscount` → `product.especialDiscount%`.
   - else no discount.
   - Monthly payment auto-applies the monthly discount unless "Ignorar descuento mensual" is checked; couple/especial only apply for non-monthly payment types.
6. **`chunk`** (payment/day split sent to server): `S` (weekly) = weekSize; `Q` (biweekly) = weekSize×2; `M` (monthly/complete) = full quantity.
7. Submit → **`POST /calculate-package-and-days`**; the **backend generates the actual calendar delivery days and payment schedule**. The frontend only displays them afterward (`GET /calendar-days/:customerId`, shown in FullCalendar).

### Sale total redistribution (`customer-sale-detail.component.ts`)
Editing a sale's total recomputes `paymentAmount = total / #payments` and `dailyAmount = total / (#dailies × #payments)` and sends them so the backend redistributes evenly.

### Menu → calorie → portion → patient (the meal domain)
- A **template day-menu** = 5 meals; each meal = ordered ingredients with size+unit.
- The **calorie config** overlays portions: kcal-level × meal × ingredient → portions.
- A **patient** carries a `Calories` profile (portion counts), a **preferences** (avoid) list, and **diseases**.
- Building a patient menu enforces: `verifyMenuPreferences()` **hard-blocks** save if any preference-listed ingredient has portions ≥ 1; disease conflicts are **soft-warned** (`avoidSickness` flag, colored rows). Removed template ingredients become `(vacio)` placeholders (status `deleted`) so the production map still zeroes the slot.

### Authorization → production → delivery pipeline
`menu-authorization` (which paid/owed days are in-scope for a date) → `menu-production-map` (aggregate all patients' portions per ingredient for the kitchen, flag missing menus/tuppers) → `menu-deliver-labels` (printable per-patient labels by zone). Printing is done by `printDiv()` replacing `document.body.innerHTML` then `window.print()` + `window.location.reload(true)`.

### Cobranza (accounts-receivable)
`customer-payment-list` shows pending payments with cadence badges (S/Q/M). "Pagar" flips `paymentStatus/recordStatus/authorized` to true. There is **no true aging bucket** (30/60/90) — "aging" is approximated by billing cadence, and the dashboard surfaces "Pagos Próximos" (upcoming) via `GET /next-payments`.

### Payroll as expense
Employee payments (nómina) are **not a separate entity** — they are `Expense` rows with `type:'Nomina'` and a `personId`, so HR reads and finance writes are intertwined (`/expenses` + `/expenses-payments-employees`).

---

## 9. Tech Debt & Risks (for the refactor)

**Framework / dependency risk**
- **Angular 9** (EOL) with **TypeScript 3.7** — several deps are version-mismatched (`@angular/cdk` 11 on Angular 9 core, `tslib` 2 vs Angular 9). A direct `ng update` path to modern Angular is not clean; a rewrite is more realistic.
- Large graph of **dead dependencies** from the purchased admin template (nvd3, ng2-charts, dragula, nouislider, masonry, summernote, toasty, ng2-validation, rxjs-compat, moment/angular2-moment). None of the "moment" stack is actually imported.

**jQuery / Bootstrap coupling**
- **jQuery 3.4 + Bootstrap 4 JS are injected globally** (`angular.json` scripts). No direct `$()` calls in TS, but every list screen's row menu uses Bootstrap's `data-toggle="dropdown"`, which **requires jQuery + Bootstrap JS at runtime**. All these dropdowns must be reimplemented natively.
- `href="javascript:void(0)"` links pervasive.

**Template engine**
- **Pug templates** (most components) rely on a fragile `postinstall` webpack patch (`ng-add-pug-loader.js`). A modern rebuild should convert to standard HTML/JSX.

**Direct DOM / imperative code**
- `document.getElementById('pagination-input').value = ''` (list resets), `printDiv()` overwriting `document.body.innerHTML` + `window.location.reload(true)` (deprecated forced reload) in production-map and labels. Fragile and not SSR-safe.

**Auth weaknesses**
- Token + roles in `localStorage`; no refresh; expiry is client-trusted; bearer-less `Authorization` header. Ambiguous `roles` shape (`isAdmin` treats it as object, `userHasRole` as array). Role gating largely enforced only by route guards, not consistently in the UI.

**Type safety / data contract**
- Services are almost entirely `any`; responses untyped. The backend contract must be re-derived (see §5) and formalized (DTOs) during the rebuild. Sequelize-style capitalized associations leak into the frontend payloads.

**Architectural smells**
- Services re-provided at component level (multiple instances).
- `SpinnerService` uses `@Output` on a service instead of a Subject.
- Near-duplicate components: `ingredient-create`/`ingredient-edit`, `menu-create`/`menu-edit`, `product-create`/`product-update`, `expense-create`/`expense-edit` — all candidates for unified create/edit forms.
- Duplicated date-range guard logic (`date-fns compareDesc`) across finance screens.
- Known small bugs to not carry over: `createNewCompany` nests the array instead of appending; `earnings-resume.findTotalAmount` unguarded `.find().total` (throws if a series is missing); `employee-create` hardcodes top-level `role:'staff'` overriding the selected role; `add-new-package` binds an undefined `onInputType`; leftover `console.log`s.
- Business rules (package pricing tiers 20/24/28, discount precedence, chunk sizing, meal skeleton, disease/preference enforcement) are **partly on the client and partly on the server** (`/calculate-package-and-days`, `/create-default-menus`, `/production-menus-map`, `/revenue-by-day`). The rebuild must decide where this logic lives; today it is split.

**Missing/weak areas**
- No automated tests of substance (default CLI Karma/Protractor scaffolding only).
- No i18n despite `@angular/localize` — all Spanish hardcoded.
- Accessibility is template-driven Bootstrap markup with `void(0)` anchors.

---

## Appendix — File map (key paths)
- Routing: `src/app/app.routing.ts` and `src/app/*/*.routing.ts`
- Root module & DI: `src/app/app.module.ts`
- Auth: `src/app/auth/` (service, guards, interceptor, login/register)
- Services: `src/app/{customers,meal-menus,finances,human-resources,dashboard}/*.service.ts`
- Interfaces: `src/app/customers/customer.interface.ts`, `src/app/meal-menus/meal-menu.interface.ts`, `src/app/finances/interfaces/*.ts`, `src/app/user/user.model.ts`
- Pricing config: `src/app/customers/customer-packages/add-new-package/packageConfig.ts`
- Shell/nav: `src/app/common/common-layout.component.*`, `src/app/template/{side-nav,header,side-panel,footer}/`
- Shared: `src/app/shared/`, `src/app/common/{general.ts,loading-spinner,table-pagination}`
- Theme/colors: `src/app/shared/config/theme-constant.ts`
- Styling: `src/assets/scss/app.scss` (+ `elements/`, `plugins/`, `common/`, `apps/`)
- Environments: `src/environments/environment{,.prod}.ts`
