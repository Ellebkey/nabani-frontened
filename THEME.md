# Maguey 2.0 — Theme Guide

> Canonical document for the Maguey (web) visual system. Written so any
> developer or LLM understands **where every color lives, who consumes it,
> and how to change it without breaking anything**.
>
> Full design reference: `docs/design_handoff_maguey/`
> Start with `README.md` → `sistema.html` → `shared/maguey.css`, and
> `dark-mode.html` for the dark mode specification.
> These files are **static HTML design references** — not production code
> and not e2e fixtures; the app recreates them with Tailwind + Material.

---

## 1 · Architecture: one source, three consumers

Every color is born in **a single module**:

```
src/styles/maguey-theme.js          ← SINGLE SOURCE OF TRUTH
│
├─▶ src/styles/maguey-theming.tailwind.js   (Tailwind plugin, addBase)
│     Emits the CSS variables into the base layer:
│       :root            → light tokens + constants
│       body.dark, .dark → dark tokens
│     Format: RGB triplets ("28 32 30") so both
│     rgb(var(--maguey-x) / alpha) and Tailwind's <alpha-value> work.
│
├─▶ tailwind.config.js
│     · Maguey utilities (text-ink, bg-surface, border-line, ring-brand/15…)
│       — they reference the CSS variables, which is why they flip in dark
│       on their own.
│     · theme.mg.customProps ← maguey-theme.magueyCustomProps
│       — generates the Maguey variables (--mg-bg-card, --mg-text-secondary…)
│       consumed by the Maguey utilities (bg-card, text-secondary…).
│
└─▶ src/@maguey/styles/themes.scss            (RUNTIME wiring, no mirror)
      Angular Material 22 components read --mat-sys-* system tokens.
      themes.scss defines those tokens FROM the --maguey-* variables
      (e.g. --mat-sys-surface: rgb(var(--maguey-card))), so Material
      dialogs/menus/buttons flip with the scheme automatically. The old
      M2 Sass theme maps are gone — Material 22 silently ignored them
      (that's what broke dark mode after the v22 upgrade). The test
      src/styles/theme-drift.spec.ts guards this wiring and forbids
      hex surface literals in themes.scss.
```

**To change a color**: edit it in `maguey-theme.js` (and `maguey-palette.ts`
when it belongs to the muted palette). Nothing else — Material follows at
runtime.

⚠️ **Cache**: Tailwind plugins are `require()`d by the config and the Angular
build cache does NOT invalidate when they change. After touching
`maguey-theme.js` or any plugin: `rm -rf .angular/cache` and restart
`ng serve`.

---

## 2 · Tokens

### Scheme-dependent (light → dark) — `schemes` in maguey-theme.js

| Token | Light | Dark | Usage |
|---|---|---|---|
| `canvas` | `#F8F9FA` | `#141715` | Page background (greenish black in dark) |
| `card` | `#FFFFFF` | `#1C201E` | Cards, modals, popovers (one step lighter than canvas) |
| `ink` | `#17201B` | `#ECEFED` | Primary text — never pure white |
| `ink-2` | `#4E5A54` | `#A9B1AD` | Secondary text, labels |
| `ink-3` | `#7C8680` | `#788079` | Hints, metadata, placeholders |
| `line` | `#E7EAE8` | `#2A2F2C` | Dividers and card borders |
| `line-strong` | `#D8DDDA` | `#39403C` | Input borders |
| `brand-tint` | `#EDF2EF` | `#243830` | Hovers, row being edited, brand backgrounds |
| `brand-tint-2` | `#DCE7E1` | `#2C443A` | Borders/accents on brand-tint |
| `teal-tint` | `#E6F4F1` | `#12312C` | Teal pill background |
| `rose-tint` | `#FCE8ED` | `#3A1A22` | Rose pill background |
| `amber-tint` | `#FCF0DC` | `#3A2C14` | Amber pill background |
| `amber` | `#B45309` | `#E8A84C` | Amber text (raises luminance in dark) |

### Constants (identical in both modes) — `constants`

| Token | Value | Usage rule (CLOSED handoff decisions) |
|---|---|---|
| `brand` | `#2A4C3C` | Brand green. The **sidebar** uses it in BOTH modes |
| `brand-strong` | `#1F3A2D` | Primary button hover |
| `gold` | `#E1B66B` | ONLY the active nav item + ONE hero amount per view |
| `teal` | `#0D9488` | ONLY amounts with a `+` sign |
| `rose` | `#E11D48` | ONLY subtraction / debt / destructive actions |
| `amber-bright` | `#F59E0B` | ONLY the notification dot and budget alert bars |

Other fixed values:
- **Modal scrim**: `rgb(23 32 27 / 0.45)` — constant, never flips.
- **Brand text in dark**: `#9DBAA9` — global rule emitted by the plugin
  (`.dark .text-brand`, brand pill, neutral tile, empty-state), also exposed
  as `--maguey-brand-on-dark`. Brand green is not readable on dark surfaces.
  Unthemed Material text/outlined buttons carry ink labels; `.mat-primary`
  ones use brand → brand-on-dark (overrides/angular-material.scss).
- **ccard** (credit card visual): its gradient derives from the method's
  color, not from the theme — unchanged in dark.

### User muted palette (16) — `userPalette`

For user-picked colors (accounts, payment methods, tags, categories).
Deliberately mid-saturation: works on both light and dark backgrounds.

Marino `#3B5F82` · Teja `#A64F4F` · Bosque `#4E8A6A` · Ciruela `#6A5A8C` ·
Ámbar `#C08A4E` · Laguna `#58939C` · Frambuesa `#A85D6E` · Acero `#5F7386` ·
Olivo `#8A8A4E` · Arcilla `#B0806A` · Ocre `#C9A45C` · Salvia `#8FA98C` ·
Malva `#7D6A85` · Índigo `#56698F` · Jade `#3E7C74` · Grafito `#2E3A46`

- UI picker: `<mg-color-swatches>` (shared).
- Legacy DB colors are mapped on the fly with `toMutedColor()`
  (`@shared/services/maguey-palette.ts`) **at data-load time** — never migrated.
- TS mirror `MAGUEY_USER_PALETTE` — covered by the drift test.

---

## 3 · Utility vocabulary (code rule)

**App code uses the Maguey utilities.** The Maguey ones are reserved for
`src/@maguey/` (they still work because they derive from the same source,
but don't use them in new features).

| Intent | ✅ Use | ❌ Avoid (Maguey) |
|---|---|---|
| Page background | `bg-canvas` | `bg-default` |
| Card/panel background | `bg-card` (with global border) / `bg-surface` (no hack) | `bg-dialog` |
| Primary text | `text-ink` | `text-default` |
| Secondary text | `text-ink-2` | `text-secondary` |
| Hint / meta | `text-ink-3` | `text-hint` |
| Divider border | `border-line`, `divide-line` | `border`, `divide-gray-*` |
| Input border | `border-line-strong` | — |
| Focus ring | `ring-brand/15` (3px) | — |

Notes:
- `bg-card` is special: the class triggers the **global border hack**
  (`styles.scss` adds `border: 1px solid rgb(var(--maguey-line))`). For a
  card surface WITHOUT the border use `bg-surface` (same color, no hack).
- **Never `dark:` in app code**: the flip is done by the CSS variables. If
  you write `dark:bg-…` in a feature, something is modeled wrong.
- Radii: `rounded-card` 12 · `rounded-btn`/`rounded-field` 10 ·
  `rounded-compact` 8. Shadows: only `shadow-overlay` on overlays; cards
  carry a border, not a shadow (handoff Option A).

### ⚠️ fontSize trap
The project's Tailwind scale is NOT the default (`text-sm`=12px,
`text-base`=14px). Handoff recipes assume the default scale: when porting
mockups use **arbitrary px** (`text-[14px]`, `text-[12.5px]`, `text-[23px]`).

---

## 4 · Dark mode — mechanics

1. `ThemeService` (`src/app/core/theme/theme.service.ts`): scheme
   `'light' | 'dark' | 'auto'`, persisted in `localStorage['scheme']`,
   default `'auto'` (respects `prefers-color-scheme`).
2. The service writes `MagueyConfigService.config.scheme`; the Maguey layout
   adds/removes the `dark` class on `<body>`.
3. `body.dark` redefines the variables → everything tokenized flips on its own.
4. UI: **Tema** row (light · dark · system) in the topbar user menu, plus the
   quick moon/sun button next to notifications.

Theme-independent zones (do NOT flip):
- **Sidebar**: always `brand #2A4C3C`; active item `rgba(255,255,255,.10)` +
  `gold` text/icon. Rules in `styles.scss` (`.theme-maguey mg-vertical-navigation…`).
- Scrim, ccard, muted palette, earth chart palette.

### Body-portal rule (overlays)
Anything portaled out of the component tree (ng-select with
`[appendTo]="body"`, CDK overlays, mat-menu/select/autocomplete/datepicker
panels, dialogs, toasts, ApexCharts tooltips) **does not inherit nested
selectors**: style it with top-level token selectors
(e.g. `.ng-dropdown-panel { background: rgb(var(--maguey-card)) }` in
`custom-ng-select.scss`; the Material panels are pinned to tokens in
`overrides/angular-material.scss`). Overlay anatomy = card background +
1px `line` border + `shadow-overlay`.

### Charts
- Axes/gridlines → `line`; labels → `ink-3` (nearly identical in both modes,
  no flip needed). The trend chart's grid reads the var with
  `getComputedStyle` and rebuilds on scheme change
  (`accounts.component.ts`, `effect` + `ThemeService.scheme` pattern).
- The cash-flow sankey paints labels with `rgb(var(--maguey-ink*))`
  directly in the SVG — flips on its own.
- Series (muted/earth palettes) don't change in dark.

---

## 5 · Where everything lives

| File | Role |
|---|---|
| `src/styles/maguey-theme.js` | **Single source**: schemes, constants, muted palette, magueyCustomProps |
| `src/styles/maguey-theming.tailwind.js` | Generates `:root` / `body.dark` (+ brand-on-dark rule) |
| `tailwind.config.js` | Maguey utilities + `theme.mg.customProps` from the source |
| `src/@maguey/tailwind/plugins/theming.js` | Maguey plugin: turns customProps into `--mg-*` vars |
| `src/@maguey/styles/themes.scss` | Runtime --mat-sys-* wiring for Angular Material (+ MDC typography) |
| `src/styles/maguey-tokens.scss` | Non-token globals (spinners, heroicons stroke 1.7, cv11) |
| `src/styles/styles.scss` | `.bg-card` border hack, sidebar rules |
| `src/styles/custom-ng-select.scss` | Themed ng-select (top-level panel, see §4) |
| `src/app/modules/shared/services/maguey-palette.ts` | `toMutedColor()` + TS mirror of the muted palette |
| `src/app/core/theme/theme.service.ts` | Light/dark/system scheme |
| `src/styles/theme-drift.spec.ts` | **Guard**: fails when a mirror drifts |
| `docs/design_handoff_maguey/` | Handoff mockups + spec (README → sistema.html → dark-mode.html) |

---

## 6 · Known gotchas (learned the hard way)

- **Angular cache vs Tailwind plugins**: editing a `.js` required by the
  config does not invalidate `.angular/cache` → stale CSS is served. Delete
  the cache.
- **`mat.form-field-density(-3)` or lower** hides every `mat-label` in MDC
  app-wide. The 40px fields come from the Maguey infix override, not density.
- **mat-form-field placeholders**: MDC only shows them with a floated label;
  with Maguey's pinned labels they never show → use the custom field pattern
  (`mg-label` + label-field) when you need a placeholder.
- **mg-modal-shell**: uses `-m-6` to cancel MatDialog padding; the host
  compensates with `w-[calc(100%+3rem)]` (and `h-[calc(100%+3rem)]` for
  full-height modals). Modal width is set in `dialog.open`, not in classes.
- **Jest + d3**: `moduleNameMapper` points `d3`/`d3-sankey` to their UMD
  builds (d3's `main` is ESM). If a suite "doesn't run", check the
  **Test Suites:** line — `Tests: N passed` can still look green.
