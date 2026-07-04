# Nabani — Refactor & Build Plan

> Companion to `00-MASTER-CONTEXT.md`. Covers: (A) how to copy the Maguey base repos,
> (B) how deep the refactor goes, (C) phased execution plan, (D) decisions to confirm.

---

## A. Copy plan — forking the Maguey base

**Verdict: rebuild on the Maguey base, do NOT upgrade the legacy repos.** Both legacy analyses
concur — Angular 9 + TS 3.7 (EOL, jQuery/pug-coupled) and Sequelize-4/Joi-14 plain-JS have no
clean upgrade path. Maguey is the same author's modern rewrite of the same lineage and already
ships Nabani's design system. We fork Maguey and swap the domain.

### A.1 Create `nabani-frontend` (from `maguey-frontend`)
```bash
# from /home/jbarranco/Proyectos/nutrivera
rsync -a --exclude={node_modules,.git,.angular,dist,coverage,test-results,.idea,frontend,release} \
  ../maguey/maguey-frontend/ ./nabani-frontend/
cd nabani-frontend && git init
```
Then:
1. **Rename identity** — `package.json` name/description → `nabani-frontend`; `index.html` title
   "Nabani"; favicon + `assets/` brand mark ← `nabani/design_handoff_nabani/assets/nabani-icon.png`;
   `environment.ts` `theme: 'theme-nabani'`, `url` → Nabani API.
2. **Rebrand tokens** — `src/styles/maguey-theme.js`: `brand #2A4C3C→#5C3A4E`, `gold #E1B66B→#E9A13B`;
   add domain blue `#3B5F82`/`#E3EDF6` (+ dark variant), 6 food-group colors, verify/extend the
   `earth` chart palette to the 8 `--e-*`. Ship depth-a. Update `theme-drift.spec.ts` mirror.
3. **Keep verbatim** — the `src/@maguey/` engine, the 3-consumer token system, all `mg-*` shared
   components, auth (service/guards/interceptor), layout shell, `HttpHelpersService`,
   `PaginationService`, `ChartService`, `CommonService`, Jest/Playwright/ESLint/Husky config.
4. **Strip finance features** — delete `src/app/modules/{accounts,expenses,incomes,inventory,reports,
   family,admin}` domain screens (keep them as *reference* until their Nabani analog is built, then
   remove). Keep `auth`, `profile`, `shared`, `layout`, `core`.
5. **(D5)** decide whether to rename `@maguey/*` → `@nabani/*` (cosmetic, high churn) or keep.

### A.2 Create `nabani-backend` (from `maguey-backend`)
```bash
rsync -a --exclude={node_modules,.git,coverage,release,backend,dist} \
  ../maguey/maguey-backend/ ./nabani-backend/
cd nabani-backend && git init
```
Then:
1. **Rename identity** — `package.json` name → `nabani-backend`; logger label `expenses-api`→`nabani-api`;
   swagger title; residual `myexpenses` identifiers.
2. **Replace secrets** — `db-migrations/config/config.json` committed creds → Nabani DB / env; refresh
   `.env.example`, `.env.test` (DB `nabani`, `nabani_test`).
3. **Keep verbatim** — `config/` (config+joi, express, sequelize, redis, logger, swagger), the full
   **auth stack** (JWT + Redis refresh + email verify/reset + password reset), `ApiKey` system,
   rate-limit, `errors/` hierarchy + middleware, Joi validation registry, `withTransaction`, logger,
   route auto-loader, `base.model.ts`, the unit+integration test harness, `User`/`UserConfig`.
4. **Delete finance domain** — models/services/controllers/routes/validations/migrations for
   `Account*`, `Expense`/`ExpenseItem`, `Income`, `Category`/`Subcategory`, `Article*`, `Recipient`,
   `PaymentMethod`, `RecurrentExpense`, `Tag`/`ExpenseTag`, `ReceiptDraft`, `Partnership*`,
   `credit-card`, `purchased-item`; drop `gemini-vision`/`fuzzy-match` (D-optional). Unregister them
   from `config/sequelize.ts` + `DbModels`.
5. **Extend roles** — add `nutriologa`, `cocina`, `front_desk`, `reparto`, `paciente` to the role enum.
6. **Add `seeders/`** — none exists in Maguey; add clinic seeds (roles, disease catalog, calorie
   levels, sample packages).

### A.3 Location & git (D4)
Proposed layout (siblings under `nutrivera/`, next to the legacy repos and the design folder):
```
/home/jbarranco/Proyectos/nutrivera/
  nutrivera-refactor/        (legacy FE — reference, untouched)
  nutrivera-backend-es6/     (legacy BE — reference, untouched)
  nabani/design_handoff_nabani/   (design source of truth)
  nabani/planning/           (these docs)
  nabani-frontend/           (NEW)
  nabani-backend/            (NEW)
```
Fresh `git init` (no Maguey history) — clean product repos. Legacy repos are never modified; keep
them as reference + optional ETL source.

---

## B. How deep does the refactor go?

**Full ground-up reimplementation on the Maguey base** — not an in-place upgrade of either legacy
repo, and not a line-by-line port of Maguey's finance domain. Depth by layer:

| Layer | Depth | Source of truth |
|---|---|---|
| Infra/architecture/auth/tooling | **Reuse verbatim** from Maguey | Maguey |
| Design system, tokens, shared components | **Reuse + rebrand** (green→plum) + build ~10 net-new pieces | Maguey + Nabani handoff |
| Data model & migrations | **New**, synthesized (legacy domain, Maguey conventions, real migrations) | Master Context §4 |
| Business logic | **Port + clean** from legacy (package days, menu resolution, aggregation, aging) | Legacy report 02 §5 |
| RBAC | **New** — the §8 role matrix (legacy had none) | Design |
| Screens (20 + 7 modals + mobile) | **New**, pixel-accurate to handoff, built from Maguey vocabulary | Nabani handoff |
| Ownership scoping | **Change** Maguey's per-user → clinic-wide role-based | Master Context §4 |
| Data | **Optional ETL** from legacy Postgres, or fresh seed (D3) | Legacy DB |

What we explicitly do **not** carry over: jQuery/Bootstrap-JS, pug, `document.body.innerHTML`
print hacks, `sequelize.sync()`-as-schema, SQL-string interpolation, per-request mutable error
object, moment/moment-timezone, the `person` patient/employee conflation, dead `branch_id`
multi-tenancy, Gemini receipt OCR.

---

## C. Phased execution plan

> Each phase is independently reviewable. Backend and frontend of a phase can run in parallel once
> the DTO/endpoint contract for that phase is fixed. Implementation will use Opus subagents fanned
> out per-resource / per-screen against these specs.

- **Phase 0 — Scaffold & rebrand** (§A). Copies, identity, plum/gold theme, delete finance, DB up
  (docker-compose PG16 + Redis), roles extended, seeds skeleton. *Exit:* both apps boot; login works.
- **Phase 1 — Backend domain.** All entities (§4) as Sequelize-6 factories + migrations + DTOs + Joi
  + services + controllers + routes + swagger + unit/integration tests. Port business logic (package
  days, menu resolution + conflict detection, production aggregation, aging, redistribution).
  *Exit:* full REST API green in integration tests; seed data loads.
- **Phase 2 — Frontend foundation.** Nabani shell (92px brand sidebar, 6 sections, chip sub-nav,
  topbar w/ global search + bell + user), role gating, auth screens, net-new DS pieces (`nb-init`,
  `mg-chip`, print stylesheet). *Exit:* shell + nav + login + one stub screen render on-brand, dark
  mode intact.
- **Phase 3 — The daily flow (core value).** Hoy dashboard · Menú del día (dynamic N-level table) ·
  Ajustes por paciente (conflict engine + swap modal) · Mapa de producción (`nb-map` + print) ·
  Etiquetas · Vista cocina · Compras y costos · Planeación/Semana · Biblioteca de platillos.
- **Phase 4 — Patients & clinical.** Pacientes list · Expediente (4 tabs) · modals: Nuevo paciente,
  Nueva venta, Registrar pago, Nueva consulta.
- **Phase 5 — Finance & catalogs.** Cobranza (aging) · Ingresos Diarios · Gastos (+ modal) · Balance
  General · Paquetes · Ingredientes · Equipo · Usuarios.
- **Phase 6 — Mobile.** Staff app (tab bar + FAB, responsive reuse) · Patient portal (Mi día /
  Progreso / Pagos / Perfil, online payment stub).
- **Phase 7 — Hardening.** Print QA (Mapa/Etiquetas), dark-mode audit, a11y, Playwright e2e for the
  daily flow, coverage ≥ Maguey thresholds, optional legacy ETL run.

---

## D. Decisions — CONFIRMED (2026-07-04, by the author, full autonomy granted)

- **D1 — v1 scope. ✅ Desktop core first.** Phases 0-5 (full back-office + daily flow). Staff mobile
  app + patient portal (Phase 6) deferred to v1.1.
- **D2 — Applied-menu storage. ✅ Fully normalized.** Catalog (Dish / DishIngredient /
  DishIngredientPortion / CalorieLevel / MenuDay / MenuDayMeal) **and** the applied patient menu
  (`DeliveryMeal` + `DeliveryMealIngredient` with conflict/substitution/elimination flags). Production
  map, shopping list, kitchen view are SQL aggregations.
- **D3 — Legacy data. ✅ ETL import.** Build a legacy-PG → new-schema import script; run in Phase 7,
  don't block Phases 1-5. Clinic goes live with ~380 patients + history.
- **D4 — Repo location. ✅** `nabani-frontend` + `nabani-backend` siblings under `nutrivera/`, fresh git.
- **D5 — Engine namespace. ✅ Keep `@maguey/*`** internally for v1 (avoid churn). Brand is 100% Nabani.
- **D6 — Multi-branch & Gemini. ✅ Drop both** for v1. Gemini plumbing archived (removed from build,
  recoverable from maguey-backend if lab/label scan is later wanted).
