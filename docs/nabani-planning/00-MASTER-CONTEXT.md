# Nabani — Master Build Context

> **This is the single source of truth for building Nabani.** It synthesizes the five
> deep-dive reports in this folder into one implementation brief. Read this first; drop into
> the numbered reports for exhaustive detail.
>
> | # | Report | Covers |
> |---|---|---|
> | 01 | `01-legacy-frontend.md` | Nutrivera Angular 9 SPA — features, routes, ~55 endpoints, models |
> | 02 | `02-legacy-backend.md` | Nutrivera Express/Sequelize-4 API — **19-table schema**, endpoints, business logic |
> | 03 | `03-maguey-frontend.md` | Maguey Angular 22 base — design system, `mg-*` components, feature recipe |
> | 04 | `04-maguey-backend.md` | Maguey TS/Express-5 base — 6-layer architecture, **9-step add-a-resource recipe** |
> | 05 | `05-design-spec.md` | Nabani "Agave" design — tokens, component CSS, **20 screens + 7 modals** |

---

## 1. What we are building

**Nabani** = the operations OS for a nutrition clinic + healthy meal-prep (tupper) delivery
business in Oaxaca, México ("nabani" = "to live / be alive" in Isthmus Zapotec). It is the
**redesign + UX-restructure + full-stack modernization** of the existing Angular-9 app
("Mi plan" / Nutrivera).

- **UI language:** Spanish (es-MX). Currency `$` MXN. Units `gr/ml/pzas/kcal`. Dates `d mmm aaaa`.
  Business timezone **America/Mexico_City**.
- **Users/roles:** `admin`, `nutriologa`, `cocina`, `front_desk`, `reparto`, plus `paciente` (portal).
- **Surface:** desktop back-office (20 screens + 7 modals), staff mobile app, patient portal.

## 2. The four codebases and how they relate

All four repos are by the same author (Joel Barranco / `ellebkey`). **Maguey is the modern
descendant of Nutrivera's lineage** (personal-finance fork). Its design system is literally
"Agave 2.0" — the same system the Nabani handoff is built on. This makes the strategy a
**three-way merge**:

```
        Nutrivera legacy                Maguey (modern base)              Nabani design handoff
  ┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
  │ nutrivera-refactor (FE)    │   │ maguey-frontend (Ng 22)    │   │ Nabani App v2.dc.html     │
  │ nutrivera-backend-es6 (BE) │   │ maguey-backend (TS/Exp5)   │   │ Nabani Movil.dc.html      │
  └───────────────────────────┘   └───────────────────────────┘   │ shared/agave.css+nabani.css│
              │                                │                    └───────────────────────────┘
       DOMAIN MODEL +                   ARCHITECTURE +                       UI / UX +
       BUSINESS LOGIC                   INFRA + DESIGN-SYS                   SCREENS
              │                                │                                 │
              └────────────────────────────────┴─────────────────────────────────┘
                                               ▼
                                  nabani-backend  +  nabani-frontend
                        (Maguey infra) + (Nutrivera domain) + (Nabani screens)
```

- Take **architecture, infra, auth, design system, component library, tooling** from **Maguey**.
- Take the **domain model + business rules** from **Nutrivera legacy** (clean up, type, normalize).
- Take **every screen, token, component anatomy and copy** from the **Nabani handoff**.

## 3. Target stack

| | Backend (`nabani-backend`) | Frontend (`nabani-frontend`) |
|---|---|---|
| Base | fork of `maguey-backend` | fork of `maguey-frontend` |
| Runtime | Node 24 · TypeScript 6 · Express 5 | Angular 22 (standalone, signals, zoneless, OnPush) |
| Data | Sequelize 6 · PostgreSQL 16 · Redis · sequelize-cli migrations | — |
| Auth | JWT (15m) + Redis refresh + bcrypt + email verify/reset (Resend) + API keys | JWT + single-flight refresh interceptor, `localStorage` |
| Validation | Joi 18 registry (`validateDto('name', data)`) | reactive forms bridged to signals via `toSignal(form.events)` |
| Styling | — | Tailwind 3 token layer + Angular Material 22 + `mg-*` components |
| Errors | `AppError` hierarchy + converter/error middleware | HotToast + `MagueyConfirmationService` |
| Tests | Jest unit (mock service) + integration (supertest + real PG/Redis) | Jest (≥95%) + Playwright e2e |
| Docs | swagger-jsdoc at `/api-docs` (dev) | THEME.md / ANGULAR-PATTERNS-GUIDE.md conventions |

## 4. Unified Nabani domain model (the synthesis)

Derived by merging the legacy 19-table schema (report 02 §2) with the entities the design
implies (report 05 §7). Modeled fresh in Sequelize-6 class factories with **real migrations**
(no more `sequelize.sync()` as schema source). Conventions from Maguey (report 04 §2):
`underscored: true`, DTOs at every boundary, services own all `db.*` + logic, thin controllers.

> **Ownership model — READ THIS.** Maguey scopes every row by `owner_id`/`user_id` (personal
> finance = per-user data). **Nabani is a shared clinic workspace** — patients, menus, sales
> etc. are clinic-wide, gated by **role**, not owned by a user. Do **not** copy Maguey's
> `where: { id, ownerId }` pattern for clinical entities. Patients carry an assigned
> `nutriologaId` (legacy `doctor_id`) for "nutriólogas authorize *their* patients", and rows
> keep audit FKs (`created_by`/`updated_by`) — but access is role-based, not owner-scoped.

### 4.1 Entities

**Identity & access** (keep from Maguey, extend roles)
- `User` — login accounts. `roles[]` ∈ {admin, nutriologa, cocina, front_desk, reparto, paciente}.
- `ApiKey`, `UserConfig` — keep as-is from Maguey.

**Patients & clinical** (from legacy `person`/`person_*`, split patient vs employee)
- `Patient` — firstName, lastName, email, cellphone, gender, birthday, `week` (delivery pattern
  `LD`/`LV`/`LS`), zone, tuppers(bool), otherFood/notes, status(active/inactive — inactive until
  first sale), `calorieLevel` (kcal target string, e.g. "1700"), `activePackageId`,
  package vigencia/lastDay, `nutriologaId`. **No patient number (deprecated — initials only).**
- `Address` — belongs to Patient (street, numberExt/Int, neighborhood, zipCode, zone).
- `Consultation` / `Measurement` (legacy `person_tracking` + Consulta sales) — date, nutriologaId,
  price, weight, bodyFat, muscle, water, arm, waist, abdomen, hip, (height/age on initial),
  `objetivoKcal` (changing it precarga menús at new level), notes, type(inicial/seguimiento).
  Deltas computed vs previous.
- `NutritionPlan` (legacy `person_calorie`) — kcal level + 9 rations (verduras, frutas, cereales,
  lácteos, p.desayuno, p.comida, p.cena, aceites, semillas) + comments. 1:1 current plan.
- `Disease` (catalog, 16 items) + `PatientDisease` (join) — normalize the legacy 17 boolean
  columns. Enfermedades shown as **blue pills**.
- `PatientPreference` (join Patient↔Ingredient) + free-text — ingredients the patient won't eat.
  Shown as **amber pills** ("No come").

**Catalog / menus** (from legacy `ingredient`, `main_menu`; design adds reusable Dishes)
- `Ingredient` — name, `foodGroup` (Verdura/Fruta/Cereal/Lácteo/Condimento/Otros — colored),
  baseUnit (gr/ml/pzas), baseQuantity (gramaje), `lastPrice` (for costing).
- `IngredientDisease` (join Ingredient↔Disease) — "No apto para" (normalizes legacy per-ingredient
  disease booleans). Drives disease-conflict detection.
- `Dish` / `Platillo` (Biblioteca de platillos) — name, `mealTime` (Desayuno/Snack/Comida/Cena),
  usageCount.
- `DishIngredient` (Dish↔Ingredient) — baseQuantity, unit, position.
- `CalorieLevel` — the dynamic N levels (1300/1700/2000/2200/2500…).
- `DishIngredientPortion` (DishIngredient × CalorieLevel → portions) — **the kcal-level ×
  ingredient → portions matrix**. Completeness ✓/✗ per level.
- `MenuDay` (Menú del día, legacy `main_menu`) — menuDay(date), status(completo/sin_porciones/borrador).
- `MenuDayMeal` (MenuDay × mealTime → Dish) — the chosen platillo per meal-time.

**Applied menus & delivery/production** (legacy `daily_income` — the load-bearing core)
- `DeliveryDay` (legacy `daily_income`) — date, patientId, saleId, paymentId, packageId, amount,
  hasMenu(bool), authorized(bool), status, `type`(Package/Consulta). This is **both** the delivery
  record **and** the income record (design treats a delivery day as an income day).
- Resolved patient menu — **see decision D2**: either normalized `DeliveryMeal` +
  `DeliveryMealIngredient` (portions, `conflictType` preference/disease, `substitutedFromId`,
  `eliminated`, `fullDishChange`) **or** a JSON snapshot like legacy `daily_income.menu`. The
  production map, labels, kitchen view and shopping list all read this.

**Sales & finance** (from legacy `product`/`sale`/`sale_item`/`payment`/`expense`)
- `Package` (Paquetes, legacy `product`) — displayLabel, code (e.g. DCCe), pricePerDay,
  consultPrice, discounts (month/couple/especial %), `includedMeals` (D/S1/C/S2/Ce booleans),
  billing options, active.
- `Sale` (Venta) — patientId, packageId, totalAmount, type(Package/Consulta), startDate, days,
  billing(Mensual/Quincenal/Semanal/Diario), discount, invoiceRequested, status, folio(rid).
- `SaleItem` — line items (Sale↔Package).
- `Payment` (installment schedule → Cobranza) — saleId, patientId, `dueDate`, amount, method
  (Efectivo/Transferencia/Tarjeta), paid(bool), note. Aging = today − dueDate.
- `Expense` (Gastos) — beneficiary/concept, total, date, type(Fijo/Variable/Nomina), comments, folio.
- `Beneficiary` / `ExpenseCompany` (lookup).

**Staff** (from legacy `person` role≠patient + `person_employee_salary`)
- `Employee` / `StaffMember` (Equipo) — name, position (Nutrióloga/Admin/Cocina/Front desk/Reparto),
  email, `salaryQuincenal`, lastPayment, optional linked `User`. Nómina = Expense(type=Nomina)
  linked to Employee.

### 4.2 Money-flow cardinality (preserve exactly — legacy report 02 §2.20, §5.1)
```
Sale ──1:*── Payment (installments) ──1:*── DeliveryDay (delivery/income days)
  │                                              │  carries resolved patient menu + hasMenu/authorized
  └── SaleItem ──*── Package ──────────────────┘
Patient ──1:*── Sale / Payment / DeliveryDay / Consultation
```

### 4.3 Derived aggregations (services + raw SQL in `queries/`, Maguey pattern)
Production map (Σ portions/ingredient across patients/day) · Shopping list (portions × gramaje →
kg, grouped by food group + subtotals) · Cost per dish · Margin per package · Cobranza aging
buckets (rose ≥30d / amber <30d / teal upcoming) · Ingresos/Gastos/Balance by period · Ingresos
por paquete · Hoy dashboard (pipeline status, requiere-atención feed, week status, ingresos de hoy,
cobranza urgente) · count active/inactive patients · expiring packages.

## 5. Key business logic to port (from legacy — report 02 §5, report 01 §8)

1. **Package day generation** (`calculatePackageDays`): given product/date/quantity/`weekType`,
   build delivery dates skipping days per `week` (`LV` skips Sat+Sun → 20d, `LS` skips Sun → 24d,
   `LD` every day → 28d), `_.chunk` into installments (`chunk`= weekSize×{1,2,N} for S/Q/M), create
   `Sale → Payments → DeliveryDays` in one transaction. Each Payment.dueDate = its first day.
2. **Discount precedence** (mutually exclusive): monthly (auto for `paymentType==='M'` unless
   ignored) → couple → especial → none. Tiers on `Package` (month/couple/especial %).
3. **Reschedule/cancel a day** (`changeDailyDay`): shift all later days +1 (respecting `week`),
   recompute last day, resync each Payment.dueDate. Portal cancel: 6:00 pm cut-off, cancelled day
   re-added at end of package.
4. **Menu resolution + conflict detection** (`getNextPatientForMenu`/`createMenuForCustomers`):
   pick MenuDay for the date → select the patient's kcal-level portions → keep only meals the
   patient's Package includes → flag each ingredient: **amber** if ∈ patient preferences,
   **blue** if ingredient not-apto for a patient disease → nutrióloga resolves conflicts only
   (swap suggests same-food-group ingredients with no disease conflict, or eliminate) → auto-apply
   only for patients with 0 preference conflicts.
5. **Authorization gate**: a DeliveryDay must be `authorized` to enter production. **Adeudo does
   NOT block** — only flagged. Nutriólogas authorize their patients; front desk on payment confirm.
6. **Production aggregation** (`getMenusMapProd`): normalize every patient's menu into the 5 meal
   slots, Σ each ingredient's portions across all patients for the day; report missing menus.
7. **Sale total redistribution** (`changeAmountSale`): editing total re-splits payment & daily amounts.
8. **Aging / cobranza**: outstanding = `paid=false`; buckets vs `dueDate`. Dashboard "next payments"
   (due ≤36h), "expire packages" (last day within ±4d).

## 6. Design system mapping (handoff CSS → Maguey vocabulary) — report 03 §2, report 05 §1-2

The handoff describes `mg-card / mg-btn / mg-field / mg-table / mg-chip` as **CSS class recipes**.
**Maguey does not implement those as classes** — it uses token Tailwind utilities + Material +
`mg-*` Angular components. **Follow Maguey's vocabulary; treat the handoff CSS as the visual spec.**

| Handoff recipe | Build in Nabani as |
|---|---|
| `.mg-card` (white, r12, 1px line) | `class="bg-card rounded-card"` (Maguey's global `.bg-card` border hack) |
| `.mg-btn` primary/secondary/ghost/danger | Angular Material buttons (`mat-flat-button color="primary"`, `mat-stroked-button`) |
| `.mg-field` / `.mg-compact` | token-styled native input (`border-line-strong bg-surface focus-within:ring-brand/15`) or `<mg-compact-select>` |
| `.mg-chip` / `.mg-chiprow` (sub-nav + filters) | **new** `mg-chip` component (small; brand-solid when active) — see gap list |
| `.mg-pill` (8 variants + dot) | existing `<mg-pill>` (already 8 variants + dot) ✅ |
| `.mg-row` transaction row | existing `<mg-transaction-row>` (grid `42px 1fr auto`) ✅ |
| `.mg-table` | `MatTable` in a `bg-card` wrapper, or plain table w/ token classes |
| `.mg-pager` | existing `<mg-pager>` ✅ |
| `.mg-modal` (brand header + scrim) | existing `<mg-modal-shell>` via `MatDialog` ✅ |
| `.mg-empty` | existing `<mg-empty-state>` ✅ |
| `.mg-tile` (icon square, `--tc`) | existing `<mg-tile>` ✅ |
| `.nb-init` (initials, no avatars) | **new** — small component or `mg-tile.neutral` variant |
| `.nb-map` (production grid) | **new** — the dense bordered table (see report 05 §4.6) |

**Net-new Nabani frontend pieces to build** (everything else reuses Maguey):
`nb-init` (initials tile) · `nb-map` production grid · dynamic-level menu table (N kcal columns +
`+ Nivel`) · `mg-chip`/chip-row sub-nav · Hoy pipeline card · week-status strip · month calendar
grid (expediente) · delivery-label card · kitchen-view card · shopping-list grouped table · the
92px brand **sidebar with 6 sections + chip sub-nav** (Maguey's shell is a compact vertical nav —
adapt it) · print stylesheet (`@media print`).

### 6.1 Brand tokens (report 05 §0 — CRITICAL)
Maguey ships **green** (`--brand #2A4C3C`, `--gold #E1B66B`). Nabani's real brand is
**plum `#5C3A4E` (ciruela / grana cochinilla) + gold `#E9A13B` (cempasúchil)**, applied at runtime
in the prototype. **Bake plum+gold as defaults** by editing `src/styles/maguey-theme.js` constants.
Also add: domain **blue** `#3B5F82`/`#E3EDF6` (disease/substitution — add a dark variant), the 6
**food-group** colors, and the 8-color **earthy** chart palette (`--e-*`; Maguey already has an
`earth` palette — verify/extend). Ship **depth-a** (flat bordered cards). Dark mode = token swap.

### 6.2 Cohesion contract (enforce in review) — report 05 §0
One anatomy per concept · accent gold ONLY on active nav + one hero/screen · six type sizes ·
semantic colors keep meaning (teal=+/paid, rose=−/overdue/destructive, amber=warning/preference) ·
max ONE primary button/view · cards flat bordered no shadow (only overlays get shadow) · every nav
closes any modal + scrolls top · transitions ≤120ms, no decorative animation · `tabular-nums` on
ALL amounts · IDs/folios in `font-mono` (`.rid`).

## 7. Screens & modals (report 05 §3-6 is the authoritative per-screen spec)

**Sidebar (6 sections → 20 screens):** `Hoy` · `Planeación`[Semana, Menú del día, Ajustes por
paciente, Biblioteca de platillos] · `Producción`[Mapa, Etiquetas, Vista cocina, Compras y costos]
· `Pacientes`[listado, Expediente(4 tabs: resumen/clínico/calendario/pagos)] · `Finanzas`[Cobranza,
Ingresos Diarios, Gastos, Balance General, Paquetes] · `Catálogos`[Ingredientes, Equipo, Usuarios].
**Finanzas + Catálogos hidden for `nutriologa`.** Plus `Login`.

**7 modals:** Nuevo paciente(760) · Nueva venta(560) · Registrar pago(480) · Nueva consulta(620) ·
Nuevo gasto(480) · Sustituir ingrediente(520) · Búsqueda global(560).

**Mobile:** staff app (bottom tab bar 5 + central gold FAB) — Login, Hoy, Ajustes, Cobranza,
Expediente. Patient portal (4 tabs) — Mi día (ONE delivery/day, cancel w/ 6pm cut-off), Mi
progreso, Pagos (pay online).

**Hardest first (report 05 §9):** ① Mapa de producción (dense N×M grid, cell conventions, print)
② Menú del día (dynamic N kcal columns) ③ Ajustes por paciente (conflict engine + swap)
④ Expediente (4 tabs) ⑤ Compras & Cobranza (derived aggregations).

## 8. Roles / RBAC matrix (design report 05 §3, §8.2)

| Screen group | admin | nutriologa | cocina | front_desk | reparto | paciente |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Hoy | ✓ | ✓ (no income/cobranza cards) | – | ✓ | – | – |
| Planeación | ✓ | ✓ | – | – | – | – |
| Producción (Mapa/Etiquetas/Compras) | ✓ | ✓ | read | – | read | – |
| Producción → Vista cocina | ✓ | ✓ | ✓ read | – | – | – |
| Pacientes / Expediente | ✓ | ✓ | – | ✓ | – | – |
| Autorización | ✓ | ✓ (own patients) | – | ✓ (on payment) | – | – |
| Finanzas | ✓ | ✗ | – | ✓ | – | – |
| Catálogos | ✓ | ✗ | – | – | – | – |
| Patient portal | – | – | – | – | – | ✓ |

Backend: `requireRole(...)` after `checkAuth` (Maguey `role.middleware.ts`). Frontend:
`roleGuardFn` per route + `authService.userHasRole()` to gate nav/cards.

## 9. Biggest risks & gotchas (from all reports)

- **Legacy has no migrations** — schema was reconstructed from models (report 02). We author fresh
  migrations; optionally ETL legacy Postgres data (`~380 patients` + history) into the new schema.
- **Load-bearing menu JSON shape** — legacy `daily_income.menu` / `main_menu.meals` carry runtime
  fields (`avoidPreference`, `avoidSickness`, `position`, `portions`, `count`). If we normalize
  (D2), migrate deliberately; if we keep JSON, preserve the shape.
- **String-based calorie-tier matching** — `person_calorie.name` must equal
  `caloriesPortions[].kcal`. Replace with FK to `CalorieLevel`.
- **`week` (LD/LV/LS)** drives all delivery-date math — port carefully with date-fns +
  `America/Mexico_City` (legacy used moment + a **missing `moment-timezone`** that crashed at runtime).
- **SQL injection** in legacy list endpoints (interpolated `req.query`) — use Sequelize / parameterized
  `replacements` (Maguey pattern).
- **No real RBAC in legacy** (any JWT could do anything) — implement the §8 matrix.
- **Committed DB credentials** in `maguey-backend/db-migrations/config/config.json` — replace.
- **Residual `myexpenses`/`expenses-api` identifiers** in the Maguey backend — rename to Nabani.
- **Person conflates patient + employee** — we split into `Patient` and `Employee`.
- **Tailwind fontSize trap** (Maguey report 03 §2.3): `text-sm`=12px, `text-base`=14px in Maguey's
  scale; handoff recipes assume default scale → port with arbitrary px (`text-[23px]`).
- **Zoneless invariant** (report 03 §1.1): templates read signals only; bridge forms via
  `toSignal(form.events)`. Golden Rule: mutate signals only after the server responds.

## 10. Open decisions (see `00-REFACTOR-PLAN.md` §Decisions for recommendations)
D1 v1 scope/phasing · D2 applied-menu storage (normalize vs JSON) · D3 legacy data ETL vs fresh
seed · D4 repo location/naming · D5 keep `@maguey` engine namespace vs rename to `@nabani`.
