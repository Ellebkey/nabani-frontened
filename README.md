<h1 align="center">Nabani — Frontend</h1>

<p align="center">
  Web client for <strong>Nabani</strong>, the operations app of a nutrition clinic + healthy
  meal‑prep delivery business in Oaxaca, México.<br/>
  Angular 22 (standalone · signals · zoneless · OnPush) · Tailwind 3 · Angular Material 22.
  UI language: <strong>es‑MX</strong>. Currency $ MXN.
</p>

---

## What this is (and how it got here)

Nabani is the redesign + modernization of the legacy **Nutrivera / "Mi plan"** Angular‑9 app. This
frontend is a **fork of Maguey** (`../maguey/maguey-frontend`, itself a modernized Fuse template),
**rebranded to the Nabani "Agave" design** (plum `#5C3A4E` / gold `#E9A13B`) and rebuilt with the
nutrition‑clinic domain. The old Maguey **finance modules are kept as reference** under
`src/app/modules/{accounts,expenses,incomes,inventory,reports,family,admin}` (unrouted from the Nabani
nav — reuse their patterns, delete when no longer needed).

> **📖 Deep reference lives in `docs/nabani-planning/`:** `05-design-spec.md` (every screen, tokens,
> component anatomy — the design source of truth), `00-MASTER-CONTEXT.md §6` (design‑system mapping),
> `03-maguey-frontend.md` (the base patterns). In‑repo: **`THEME.md`**, **`ANGULAR-PATTERNS-GUIDE.md`**,
> `PRODUCT-STYLE.md`.

## Prerequisites

- Node 24+ (Node 20+ works), npm.
- **The Nabani backend running** (see `../nabani-backend`) at `http://localhost:5333/api`.

## Setup & run

```sh
npm install
npm start          # ng serve → http://localhost:5332
```

> **Open the app at `http://localhost:5332` — NOT `127.0.0.1:5332`.** The backend's CORS is pinned to
> `http://localhost:5332`, so a `127.0.0.1` origin fails the preflight and login won't work.

- API base URL: `src/environments/environment.ts` → `http://localhost:5333/api` (prod → `environment.prod.ts`).
- Dev login: **admin@nabani.app / nabani123** (create it via the backend README if the DB is fresh).
- `npm run build` → production bundle in `frontend/`. `npm run test` (Jest) · `npm run e2e` (Playwright).

## Architecture

```
src/
├── @maguey/                     # The ENGINE (renamed Fuse core) — navigation, alert, loading-bar,
│                                #   splash, confirmation, Tailwind theming plugins. Consume, don't edit.
├── app/
│   ├── core/                    # auth (service + functional guards + refresh interceptor), theme,
│   │                            #   navigation (navigation.menu.data.ts), icons, title
│   ├── layout/                  # the shell: layouts/vertical/compact (Nabani 92px sidebar + topbar),
│   │                            #   common/user; auth uses the 'empty' layout
│   └── modules/
│       ├── shared/              # DESIGN SYSTEM: components (mg-pill, mg-tile, nb-init, mg-chip,
│       │                        #   mg-modal-shell, mg-pager, mg-empty-state, mg-transaction-row…) +
│       │                        #   interfaces (models) + services (HttpHelpersService, pagination…)
│       ├── hoy/ planeacion/ produccion/ pacientes/ finanzas/ catalogos/   # Nabani sections
│       └── accounts/ expenses/ … profile/ auth/                           # (legacy finance = reference)
└── styles/                      # maguey-theme.js = SINGLE SOURCE OF TRUTH for tokens; styles.scss;
                                 #   theme-drift.spec.ts (guards the palette)
```

Routing (`src/app/app.routing.ts`): hash‑based, lazy per section, guarded by `authGuardFn`. Each section
is `loadChildren: () => import('./modules/<x>/<x>.routing')`.

## Design system ("Agave 2.0")

**Tokens are the single source of truth** in `src/styles/maguey-theme.js` → CSS variables (RGB triplets)
→ Tailwind utilities + Material `--mat-sys-*` runtime wiring. Brand = **plum `#5C3A4E`**, accent =
**gold `#E9A13B`**. Dark mode = automatic CSS‑variable flip.

Use **token utilities**, never `dark:` in app code:
`bg-canvas` / `bg-card` · `text-ink` / `text-ink-2` / `text-ink-3` · `border-line` / `border-line-strong`
· `rounded-card`(12) `rounded-btn/field`(10) · `brand` / `brand-tint` / `gold` · semantics `teal`(+/paid)
`rose`(−/overdue) `amber`(warning/preference) · domain `blue` / `blue-tint`(enfermedad/sustitución) ·
`food-{verdura,fruta,cereal,lacteo,condimento,otros}` · `earth-*`(charts).

Reusable components (`src/app/modules/shared/components/`): `<mg-pill [variant] [color]>`,
`<nb-init [name] size>` (initials, no avatars), `<mg-chip>`/`<mg-chip-row>` (section sub‑nav + filters),
`<mg-modal-shell>` (dialog chrome via MatDialog), `<mg-pager>`, `<mg-empty-state>`, `<mg-transaction-row>`,
`<mg-tile>`, `<mg-compact-select>`. Cohesion rules + full component anatomy in `05-design-spec.md`.

## Screens (6 sidebar sections → 20 screens)

`Hoy` · `Planeación`[semana · dia (Menú del día, dynamic N‑kcal‑level editor) · ajustes (conflict queue
+ Sustituir modal) · platillos (Biblioteca)] · `Producción`[mapa (`nb-map` grid, print) · etiquetas ·
cocina · compras] · `Pacientes`[list · expediente (4 tabs) + Nuevo paciente/venta/pago/consulta modals]
· `Finanzas`[cobranza · ingresos · gastos · balance · paquetes] · `Catálogos`[ingredientes · equipo ·
usuarios]. Plus **Login**. Finanzas + Catálogos are hidden for non‑admins.

## Add a screen / section

Mirror the **`catalogos/` or `incomes/` module** (both compile cleanly and show every pattern):

1. `src/app/modules/<section>/` with `<section>.routing.ts` (exports `Routes`), a `*.service.ts`
   extending `HttpHelpersService` (returns `RecordsList<T>` / report shapes), and standalone OnPush
   components using `signal()`/`computed()`.
2. Wire the lazy route in `app.routing.ts` (`loadChildren`).
3. Compose from the canonical page container `flex w-full max-w-screen-xl flex-col mx-auto p-4 sm:p-6
   md:p-8` + the `mg-*`/`nb-*` components + token utilities.
4. Modals via `MatDialog` + `<mg-modal-shell>`; toasts `HotToastService`; confirms `MagueyConfirmationService`.

### Invariants (will bite you otherwise)
- **Zoneless:** templates read **signals** only. Never read `form.invalid` / `form.value.x` directly —
  bridge with `formEvents = toSignal(form.events)` + `computed()`. Mutate signals **after** the server
  responds (the "Golden Rule").
- **No `dark:`** in app code — tokens flip via CSS variables.
- **fontSize trap:** this Tailwind scale is custom (`text-sm`=12px, `text-base`=14px). For handoff sizes
  use arbitrary px (`text-[23px]`, `text-[30px]`).
- `tabular-nums` on all amounts; `font-mono` on ids/folios. All copy in **Spanish (es‑MX)**.
- Standalone + OnPush + `inject()` + `@if/@for` are enforced by ESLint.

## Testing

- **Jest** (`npm test`): co‑located `*.spec.ts`; `src/styles/theme-drift.spec.ts` guards the palette.
- **Playwright** (`npm run e2e`): `e2e/`, baseURL `http://localhost:5332`.

## Status

- ✅ **All 20 desktop screens built + verified** via a Playwright browser smoke (login + every route
  renders, 0 console/network errors) and screenshot review. Login uses the brand banner; favicon set wired.
- ⏳ **Remaining:** **mobile staff app + patient portal** (deferred to v1.1); global‑search topbar modal
  (`buscar`); dark‑mode login banner variant (the PNG is light‑only); broaden component specs.

## Troubleshooting

- **Login fails / CORS:** open `http://localhost:5332` (not `127.0.0.1`); ensure the backend runs on
  `:5333` and its `FRONTEND_URL=http://localhost:5332`.
- **`:5332` busy / stale dev server:** `fuser -k 5332/tcp`.
- **Theme edits not applying:** editing `maguey-theme.js` / Tailwind plugin JS doesn't invalidate the
  Angular cache — `rm -rf .angular/cache` and restart.
- Port `:4200` may be used by another app on this machine — Nabani local is `:5332`.

Commit prefixes: `feat:` `fix:` `refactor:` `chore:`.
