# Maguey — Personal Expense Management

## Product Overview

**The Pitch:** A full-featured personal finance ledger that organizes expenses, incomes, and accounts into a calm, structured workspace. It combines rich filtering, category-driven charts, receipt scanning (OCR), and a Sankey-based cash-flow report to give users deep visibility into their spending — without visual clutter.

**For:** Individuals and freelancers who want precise, granular tracking of every peso spent, organized by categories, subcategories, merchants, tags, and payment methods — all in Spanish (es_MX).

**Device:** Desktop-first (responsive down to 600px tablets, but primary target is 960px+ desktops).

**Design Direction:** Clean and airy with generous whitespace, a dark-green sidebar anchoring the navigation, and warm gold accents for active/monetary highlights. Cards on a light gray canvas. Minimal shadows, rounded corners (6-8px), and a muted color palette punctuated by semantic status colors.

**Inspired by:** Linear (clean data density), Mercury (financial clarity), Fuse Angular template (component architecture).

---

## Screens

- **Dashboard:** Account overview with pie chart (balance distribution), bar chart (monthly income vs expense trend), and per-account ledger with date-range filtering.
- **Expenses List:** Grouped-by-date expense cards with category bar chart, merchant/payment-method/date filters, tag summary cards, and expandable item details.
- **Expense Create/Edit Modal:** Full-viewport overlay with article line-items, category/subcategory pickers, tags, payment method, receipt scanning, and draft support.
- **Credit Card Statement:** Dedicated statement view for credit-card expenses and debt tracking.
- **Incomes List:** Table-based income list with pagination, concept types (Nomina/Freelance/Otros), and create/edit dialog.
- **Cash Flow Report:** D3 Sankey diagram (category -> subcategory flow), drill-down panels for subcategory and expense-item detail, inline category editing, tag-based filtering.
- **Inventory — Articles:** Paginated table with bulk selection, search, and create/edit modals.
- **Inventory — Merchants:** Paginated table with CRUD modals.
- **Admin — Categories:** Expandable category/subcategory tree with create/edit/delete modals.
- **Admin — Payment Methods:** Card grid with color-coded payment cards, create/edit modals.
- **Admin — Accounts:** Card grid with color-coded account cards, sections/savings pots, inter-account transfers.
- **Admin — Tags:** Tag list/grid with color picker, create/edit modals.
- **Profile:** Username, roles display, change-password form.
- **Auth Screens (Empty Layout):** Sign In, Sign Up, Forgot Password, Reset Password, Verify Email.

---

## Key Flows

**Filtering Expenses:** User narrows down a specific merchant's recent spending
1. User is on Expenses List -> sees date presets (Este mes, 3 meses, 6 meses, etc.) and filter dropdowns
2. User selects "3 meses" preset, picks a merchant from the ng-select dropdown (virtual scroll, multi-select)
3. Expense list reloads grouped by date, category bar chart recalculates, tag summary cards update

**Recording a New Expense:** User logs a grocery trip
1. User clicks "Crear Gasto" button (primary color, top right of Expenses List)
2. Full-viewport modal opens with article line-item manager, recipient picker, payment method dropdown, date/time picker, and tag multi-select
3. User adds articles (concept, quantity, unit price, category/subcategory), optionally scans a receipt via OCR
4. User saves -> modal closes, expense list refreshes, success toast appears

**Analyzing Cash Flow:** User investigates monthly spending by category
1. User navigates to Reports > Flujo de Efectivo
2. Sankey chart renders showing category -> subcategory flows, color-coded by category
3. User clicks a category node -> subcategory drill-down panel expands to the right
4. User clicks a subcategory -> expense items list appears with inline editing for re-categorization

**Managing Accounts:** User reviews account balances
1. User is on Dashboard -> sees account cards with balances, pie chart distribution, monthly trend bar chart
2. User selects an account -> ledger table below updates with transactions (date, description, debit, credit, running balance)
3. User can filter by date range presets or transfer between accounts

---

<details>
<summary>Design System</summary>

## Color Palette

### Brand Colors
- **Primary (Maguey):** `#2a4c3c` — Sidebar background, primary buttons, active states, info snackbar
- **Accent (Maguey):** `#aa6d4b` — Warm brown, secondary highlights
- **Gold:** `#e1b66b` — Active sidebar items, monetary value highlights, gold accent text

### Dev Theme Variant
- **Primary (Dev):** `#2a3c4c` — Navy blue sidebar
- **Accent (Dev):** `#4b6daa` — Slate blue, active items replace gold with `#6ba5e1`

### Surface & Background (Light)
- **Background:** `#F8F9FA` — Page canvas, default surface
- **Card:** `#FFFFFF` — Cards, modals, dialogs, app bar
- **Hover:** `rgba(0, 0, 0, 0.04)` — Row/item hover state
- **Status Bar:** `#E5E7EB` — Status bar background

### Surface & Background (Dark)
- **Background:** `#0F172A` (slate.900) — Page canvas
- **Card:** `#1E293B` (slate.800) — Cards, modals, dialogs
- **Hover:** `rgba(255, 255, 255, 0.05)` — Row/item hover state
- **Status Bar:** `#0F172A` (slate.900)

### Text (Light)
- **Default:** `#1A1A2E` — Primary body, headings, amounts
- **Secondary:** `#6B7280` — Labels, metadata, icons
- **Hint:** `#9CA3AF` — Placeholders, disabled hints
- **Disabled:** `#D1D5DB` — Disabled text and controls

### Text (Dark)
- **Default:** `#FFFFFF`
- **Secondary:** `#94A3B8` (slate.400)
- **Hint:** `#64748B` (slate.500)
- **Disabled:** `#475569` (slate.600)

### Borders & Dividers (Light)
- **Border:** `rgba(0, 0, 0, 0.08)` — Subtle structural borders
- **Divider:** `rgba(0, 0, 0, 0.06)` — Row dividers, section separators

### Borders & Dividers (Dark)
- **Border:** `rgba(241, 245, 249, 0.12)`
- **Divider:** `rgba(241, 245, 249, 0.12)`

### Semantic / Status Colors
- **Success:** `#0D9488` — Success toasts, positive indicators
- **Warning:** `#F59E0B` — Warning toasts, caution indicators
- **Error:** `#E11D48` — Error toasts, destructive actions, validation errors
- **Info:** `#2a4c3c` — Info toasts (uses primary color)

### Sidebar Navigation Colors
- **Background:** `var(--sidebar-bg)` — `#2a4c3c` (maguey) / `#2a3c4c` (dev)
- **Inactive text:** `rgba(255, 255, 255, 0.7)`
- **Hover background:** `rgba(255, 255, 255, 0.06)`
- **Active background:** `rgba(255, 255, 255, 0.08)`
- **Active icon/text:** `var(--sidebar-active)` — `#e1b66b` (maguey) / `#6ba5e1` (dev)
- **Aside active border-left:** `2px solid var(--sidebar-active)`

## Typography

### Font Families
- **Primary (UI):** `"Inter var"`, sans-serif — Variable font (weight 100-900), loaded locally from `/assets/fonts/inter/`
- **Monospace:** `"IBM Plex Mono"`, monospace — Loaded from Google Fonts (weights 400, 500, 600 + italic 400)
- **Icons:** `Material Icons` — Loaded from Google Fonts

### Font Feature Settings
- Body uses `font-feature-settings: 'salt'` (Inter stylistic alternates)
- Text rendering: `optimizeLegibility`
- Font smoothing: `auto` (sub-pixel rendering)

### Type Scale (Tailwind)
| Token | Size | Typical Use |
|-------|------|-------------|
| xs | 0.625rem (10px) | Fine print, badges |
| sm | 0.75rem (12px) | Captions, overlines, small labels |
| md | 0.8125rem (13px) | Secondary UI text |
| base | 0.875rem (14px) | **Default body text**, buttons, form fields |
| lg | 1rem (16px) | Subtitles, emphasized body |
| xl | 1.125rem (18px) | Section headings |
| 2xl | 1.25rem (20px) | Card titles |
| 3xl | 1.5rem (24px) | Page sub-headings |
| 4xl | 2rem (32px) | Page headings (mobile) |
| 5xl | 2.25rem (36px) | Large display numbers |

### Material Typography Hierarchy
| Level | Size | Weight | Line Height | Use |
|-------|------|--------|-------------|-----|
| headline-1 | 1.875rem (30px) | 800 | 2.25rem | Page titles |
| headline-2 | 1.25rem (20px) | 700 | 1.75rem | Section titles |
| headline-3 | 1.125rem (18px) | 600 | 1.75rem | Card headers |
| headline-4 | 0.875rem (14px) | 600 | 1.25rem | Subsection titles |
| subtitle-1 | 1rem (16px) | 400 | 1.75rem | Subtitles |
| subtitle-2 | 0.875rem (14px) | 600 | 1.25rem | Bold labels |
| body-1 | 0.875rem (14px) | 400 | 1.5rem | Primary body |
| body-2 | 0.875rem (14px) | 400 | 1.5rem | Secondary body |
| caption | 0.75rem (12px) | 400 | 1rem | Captions, metadata |
| button | 0.875rem (14px) | 500 | 0.875rem | Button labels |
| overline | 0.75rem (12px) | 500 | 2rem | Overlines, status labels |

### Root Font Size
- `html { font-size: 16px; }` — REM base
- `body { font-size: 0.875rem; }` — 14px default reading size

## Design Tokens

```css
/* === BRAND === */
:root {
  --primary-color: #2a4c3c;
  --app-gold: #e1b66b;
  --sidebar-bg: #2a4c3c;
  --sidebar-active: #e1b66b;
}

.theme-maguey-dev {
  --primary-color: #2a3c4c;
  --sidebar-bg: #2a3c4c;
  --sidebar-active: #6ba5e1;
}

/* === LIGHT SCHEME (default) === */
:root {
  --fuse-bg-app-bar: #FFFFFF;
  --fuse-bg-card: #FFFFFF;
  --fuse-bg-default: #F8F9FA;
  --fuse-bg-dialog: #FFFFFF;
  --fuse-bg-hover: rgba(0, 0, 0, 0.04);
  --fuse-bg-status-bar: #E5E7EB;

  --fuse-text-default: #1A1A2E;
  --fuse-text-secondary: #6B7280;
  --fuse-text-hint: #9CA3AF;
  --fuse-text-disabled: #D1D5DB;

  --fuse-border: rgba(0, 0, 0, 0.08);
  --fuse-divider: rgba(0, 0, 0, 0.06);
  --fuse-icon: #6B7280;
  --fuse-mat-icon: #6B7280;
}

/* === DARK SCHEME === */
.dark {
  --fuse-bg-app-bar: #0F172A;
  --fuse-bg-card: #1E293B;
  --fuse-bg-default: #0F172A;
  --fuse-bg-dialog: #1E293B;
  --fuse-bg-hover: rgba(255, 255, 255, 0.05);
  --fuse-bg-status-bar: #0F172A;

  --fuse-text-default: #FFFFFF;
  --fuse-text-secondary: #94A3B8;
  --fuse-text-hint: #64748B;
  --fuse-text-disabled: #475569;

  --fuse-border: rgba(241, 245, 249, 0.12);
  --fuse-divider: rgba(241, 245, 249, 0.12);
  --fuse-icon: #94A3B8;
  --fuse-mat-icon: #94A3B8;
}

/* === SEMANTIC COLORS (Tailwind custom) === */
:root {
  --app-gold: #e1b66b;
  --app-success: #0D9488;
  --app-warning: #F59E0B;
  --app-error: #E11D48;
}

/* === FONT FAMILIES === */
:root {
  --font-sans: "Inter var", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}

/* === SPACING (base unit: 4px) === */
/* Standard Tailwind 4px grid + custom large values:
   13=52px, 15=60px, 18=72px, 22=88px, 26=104px,
   30=120px, 50=200px, 90=360px, 100=400px, 120=480px,
   128=512px, 160=640px, 200=800px, 256=1024px, 320=1280px */

/* === BORDER RADIUS === */
:root {
  --radius-sm: 4px;    /* Tabs, thin nav items, multi-select chips */
  --radius-md: 6px;    /* Buttons, form fields, nav items, dropdowns, cards */
  --radius-lg: 8px;    /* Dialogs, expansion panels, group containers */
  --radius-xl: 12px;   /* Mini FAB */
  --radius-2xl: 16px;  /* FAB */
  --radius-full: 24px; /* Rounded form fields (fuse-mat-rounded) */
}
```

### Tailwind Utility Classes (Custom)

| Class | Effect |
|-------|--------|
| `.text-default` | Primary text color (light/dark aware) |
| `.text-secondary` | Secondary text color |
| `.text-hint` | Hint/placeholder text color |
| `.text-disabled` | Disabled text color |
| `.bg-card` | Card background (white / slate.800) |
| `.bg-default` | Page background (#F8F9FA / slate.900) |
| `.bg-dialog` | Dialog background |
| `.bg-hover` | Hover state background |
| `.divider` | Divider color |
| `.text-app-gold` | Gold accent `#e1b66b` |
| `.text-app-success` | Success green `#0D9488` |
| `.text-app-warning` | Warning amber `#F59E0B` |
| `.text-app-error` | Error rose `#E11D48` |
| `.bg-app-gold/10` | Gold with 10% opacity (works with any opacity) |
| `.bg-app-success/10` | Success with 10% opacity |
| `.icon-size-5` | Icon 20px square (also 3, 4, 6, 8, 10, 12, etc.) |

</details>

---

<details>
<summary>Component Specifications</summary>

## Layout Shell

**Structure:**
```
┌──────────────────────────────────────────────────┐
│ Sidebar (112px)  │  Header (64px h, full width)  │
│                  ├───────────────────────────────│
│  Logo (80px h)   │                               │
│                  │    Main Content Area           │
│  Nav Items       │    (router-outlet)             │
│  (compact icons  │                               │
│   + labels)      │    Padding: 16px (sm) / 24px  │
│                  │                               │
│  Full height     │                               │
│  (100vh, sticky) │                               │
└──────────────────────────────────────────────────┘
```

**Sidebar:**
- Width: 112px (compact appearance)
- Background: `var(--sidebar-bg)` (`#2a4c3c`)
- Position: sticky, full viewport height
- Mode: `side` on md+ (960px+), `over` (drawer) below md
- Logo: `w-16` (64px) image, centered in 80px-tall container
- Nav items: column flex, centered icon + 12px title below, 8px gap
- Z-index: 200

**Header:**
- Height: 64px (`h-16`)
- Background: white (app-bar)
- Bottom border: 1px solid `rgba(0, 0, 0, 0.08)`
- Padding: 16px (sm) / 24px (md+)
- Contents: menu toggle, draft notification badge, user avatar menu
- Z-index: 49

**Main Content:**
- Fills remaining width after sidebar
- Padding varies by screen (typically `p-4 sm:p-6 md:p-8`)
- Background: `#F8F9FA` (bg-default)

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| < 600px | Mobile | Sidebar hidden (overlay mode), stacked layouts |
| sm (600px) | Tablet | Sidebar overlay, 2-column grids begin |
| md (960px) | Desktop | Sidebar always visible (side mode), full layouts |
| lg (1280px) | Large | Wider content areas |
| xl (1440px) | XL | Maximum content width containers |

## Navigation Menu

**Type:** `aside` — compact sidebar icons with expandable submenu panels

| Section | Icon | Children |
|---------|------|----------|
| Dashboard | `heroicons_outline:home` | Resumen (`/dashboard`) |
| Gastos | `heroicons_outline:credit-card` | Listado (`/expenses/list`), Estado de Cuenta (`/expenses/statement`) |
| Inventario | `heroicons_outline:cube` | Articulos (`/inventory/articles`), Beneficiarios (`/inventory/merchants`) |
| Ingresos | `heroicons_outline:currency-dollar` | Listado (`/incomes/list`) |
| Reportes | `heroicons_outline:chart-bar` | Flujo de Efectivo (`/reports/cash-flow`) |
| Administracion | `heroicons_outline:cog-6-tooth` | Cuentas (`/admin/accounts`), Metodos de Pago (`/admin/payment-methods`), Etiquetas (`/admin/tags`), Categorias (`/admin/categories`) |

## Buttons

| Variant | Height | Padding | Radius | Example |
|---------|--------|---------|--------|---------|
| Standard | 40px | 0 20px | 6px | `mat-flat-button`, `mat-raised-button`, `mat-stroked-button` |
| Large | 48px | 0 20px | 6px | `.fuse-mat-button-large` |
| Icon | 40x40px | 0 | 6px | `mat-icon-button` |
| FAB | 56px | — | 16px | `mat-fab` |
| Mini FAB | 48px | — | 12px | `mat-mini-fab` |

**Primary button:** `color="primary"` — uses `#2a4c3c` fill, white text
**Accent button:** `color="accent"` — uses `#aa6d4b` fill
**Warn button:** `color="warn"` — red palette for destructive actions

## Form Fields

- **Appearance:** `fill` (Material standard)
- **Height:** 48px minimum (inner flex container)
- **Dense variant:** 40px (`.fuse-mat-dense`)
- **Border:** 1px solid `gray-300` (light) / `gray-500` (dark)
- **Border radius:** 6px (standard) / 24px (`.fuse-mat-rounded`)
- **Background:** white (light) / `black/5` (dark)
- **Focus border:** `var(--fuse-primary)` (primary color)
- **Error border:** `var(--fuse-warn)` (red)
- **Label spacing:** 24px top margin when label is present
- **Icon spacing:** 12px margin from input edge
- **Horizontal padding:** 16px

## ng-select Dropdowns

- **Container height:** 50px
- **Border radius:** 6px
- **Border:** 1px solid `gray-300` / `gray-500` (dark)
- **Background:** white / `black/5` (dark)
- **Shadow:** `shadow-sm`
- **Dropdown panel radius:** 6px
- **Dropdown shadow:** `0 2px 4px -1px rgba(0,0,0,0.2), 0 4px 5px 0 rgba(0,0,0,0.14), 0 1px 10px 0 rgba(0,0,0,0.12)`
- **Selected option bg:** `bg-primary/20`
- **Multi-select chips:** `rgba(var(--fuse-primary-rgb), 0.1)` bg, `var(--primary-color)` text, 4px radius

## Cards & Containers

**Group Container (Expense date groups):**
- Background: `#FFFFFF`
- Padding: 20px 24px
- Margin bottom: 20px
- Border: 1px solid `rgba(0,0,0,0.08)`
- Border radius: 8px

**Expanded Row:**
- Border-left: 3px solid `var(--primary-color)`
- Background: `rgba(42, 76, 60, 0.015)`
- Border radius: 6px

**Dialogs/Modals:**
- Border radius: 8px
- Padding: 24px
- Full-viewport modals: `maxWidth: 100vw, maxHeight: 100vh`
- Overlay backdrop for mobile

**Expansion Panels:**
- Border radius: 8px
- Box shadow: none (flat style, borders only)

## Icons

**Icon Sets Available:**
- `heroicons_outline` — Primary UI icons (outlined style)
- `heroicons_solid` — Filled variants for active/selected states
- `heroicons_mini` — Smaller heroicon variants
- `mat_outline` — Material outlined icons
- `mat_solid` — Material filled icons
- `feather` — Feather icon set

**Sizing (Tailwind plugin):**
| Class | Size |
|-------|------|
| `icon-size-3` | 12px |
| `icon-size-4` | 16px |
| `icon-size-5` | 20px (standard UI) |
| `icon-size-6` | 24px |
| `icon-size-8` | 32px |
| `icon-size-10` | 40px |
| `icon-size-12` | 48px |

**Common Icons:**
- Navigation: `x-mark`, `chevron-right`, `chevron-down`, `bars-3`
- Actions: `plus`, `trash`, `pencil`, `check`, `arrow-path`
- Status: `check-circle`, `x-circle`, `exclamation-triangle`, `information-circle`
- Content: `bell`, `banknotes`, `cube`, `building-storefront`, `credit-card`
- Search: `magnifying-glass`

</details>

---

<details>
<summary>Screen Specifications</summary>

### Dashboard (Accounts Overview)

**Purpose:** Primary landing page showing account balances, distribution, and monthly trends.

**Layout:** Full-width content area. Top section: account card grid. Below: pie chart (account distribution) + bar chart (monthly income vs expenses, 6-month). Bottom: ledger table for selected account.

**Key Elements:**
- **Account Cards:** Color-coded grid cards showing account name, icon, and formatted balance (MXN currency)
- **Pie/Donut Chart:** ApexCharts — shows balance distribution across accounts. Interactive legend.
- **Monthly Trend Chart:** ApexCharts bar chart — grouped bars (Income green, Expense red) over 6 months.
- **Ledger Table:** MatTable — Columns: Date, Description, Debit, Credit, Balance. Server-paginated.
- **Date Range Picker:** Material date-range with presets: Este mes, 3 meses, 6 meses, Este anio, 1 anio, Todo.
- **Quick Actions:** Transfer between accounts, manage savings sections.

**States:**
- **Loading:** Global loading bar (top, 6px height, indeterminate)
- **Empty:** No accounts — centered icon + "No accounts configured" message + CTA button

---

### Expenses List

**Purpose:** Primary expense browsing and filtering workspace.

**Layout:** Header row (title + create button). Filter bar (date presets + merchant/payment dropdowns). Two-column below: left 1/3 category bar chart, right 2/3 scrollable expense groups.

**Key Elements:**
- **Header:** `text-2xl sm:text-3xl font-semibold` title "Gastos", primary "Crear Gasto" button (right-aligned)
- **Date Presets:** Horizontal button group — Este mes, 3 meses, 6 meses, Este anio, 1 anio, Todo. Active preset: primary color fill.
- **Filter Dropdowns:** ng-select with virtual scroll. Merchant (multi-select, searchable). Payment method (multi-select, color-coded badges with circular color dot + name).
- **Category Bar Chart:** ApexCharts horizontal bar, color-coded by category, date label header.
- **Tag Summary Cards:** Standalone cards showing tag name (with color dot), expense count. Clickable to filter.
- **Expense Groups:** Grouped by date. Group header: `EEE - MMMM d, y` format, `text-secondary`, `font-semibold`, with subtle bottom border.
- **Expense Item Card:** Expandable row. Shows: category icon (40px, 10px radius, color-coded bg), merchant name, amount (right-aligned), payment method badge. Expanded: full article list, tags, notes.

**States:**
- **Empty:** Centered 24px icon in 96px circle (`bg-[rgba(0,0,0,0.04)]`), "No hay gastos registrados" heading, "Los gastos apareceran aqui..." subtext, "Crear Primer Gasto" CTA button.
- **Loading:** Top loading bar (indeterminate)
- **Filtered Empty:** "No se encontraron gastos con estos filtros" with clear-filters option

---

### Expense Create/Edit Modal

**Purpose:** Comprehensive data entry for recording or editing an expense.

**Layout:** Full-viewport overlay (`maxWidth: 100vw, maxHeight: 100vh`). Header bar (64px, primary color bg, white text). Two-column body: left 1/4 form sidebar, right 3/4 article list manager.

**Key Elements:**
- **Header:** Primary color background, expense title or "Nuevo Gasto", close (X) button.
- **Form Sidebar:** Recipient (ng-select, searchable), Payment method (ng-select with color badges), Date picker, Time input, Tags (ng-select multi), Notes (text area).
- **Article List Manager:** Table with columns: Concept (searchable ng-select), Quantity, Unit Price, Discount, Subtotal, Category, Subcategory, Actions. Inline add/edit. Running total at bottom.
- **Receipt Scan:** Camera capture -> OCR processing -> article review with fuzzy matching (Fuse.js). Three-step wizard: capture, process, review.
- **Footer:** Cancel (text button), Save as Draft (outlined), Save (primary filled).

**Interactions:**
- `disableClose: true` — cannot dismiss by clicking outside
- Escape key closes (with unsaved changes warning)
- Draft state: saves incomplete expense for later completion

---

### Cash Flow Report

**Purpose:** Deep visual analysis of spending patterns via Sankey flow diagram.

**Layout:** Top bar: date range picker + tag filter. Main area: 3-panel horizontal layout. Left: Sankey chart. Center: subcategory drill-down. Right: expense item detail.

**Key Elements:**
- **Sankey Chart:** D3 + d3-sankey. Nodes: categories (left) -> subcategories (right) -> total. Links color-coded by source category. Node click triggers drill-down.
- **Subcategory Panel:** Appears on category node click. Lists subcategories with expense counts and totals. Click to drill into items.
- **Expense Items Panel:** Appears on subcategory click. Paginated list with inline category/subcategory editing (ng-select). Save/cancel per row.
- **Tag Summary Cards:** Same component as Expenses List, filters the entire report.
- **Date Presets:** Same preset buttons as other screens.

**State Management:** Angular Signals — `sankeyData`, `selectedCategory`, `selectedSubCategory`, `expenseItems`, `isLoading`, `error`.

**Interactions:**
- Click Sankey node -> expand drill-down panel (smooth scroll)
- Inline edit category -> save icon appears -> confirm to update
- Tag click -> overrides date filter, reloads entire report

---

### Admin — Categories Management

**Purpose:** CRUD for global categories and nested subcategories.

**Layout:** Full-width list. Each category is an expandable row with subcategory children.

**Key Elements:**
- **Category Row:** Icon (color-coded, 40px), name, expense count, expand chevron. Border-bottom separator.
- **Subcategory Row:** Indented, smaller text, edit/delete actions on hover.
- **Create/Edit Modal:** Form with: Name, Icon picker, Color picker. For subcategories: parent category pre-selected.
- **Chevron Animation:** Rotates 90deg on expand (`transition: transform 0.25s ease`).

**States:**
- **Loading:** Shimmer skeleton bars (`linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)`, `animation: shimmer 1.5s infinite`)
- **Empty:** "No hay categorias" message + create button

---

### Admin — Payment Methods

**Purpose:** Visual card grid for managing payment methods.

**Layout:** Responsive card grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).

**Key Elements:**
- **Payment Card:** SVG-based card visual with background color, card number (masked), cardholder name. Simulates physical card appearance.
- **Card Hover:** `transform: translateY(-4px)`, `box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35)`. Transition: `all 0.3s ease`.
- **Color Palette:** User-selectable card background colors.
- **Dark text detection:** Automatic text color contrast based on card background luminance.

---

### Auth Screens (Empty Layout)

**Purpose:** Authentication flows without sidebar/header chrome.

**Layout:** Centered card on bg-default canvas. No sidebar, no header. Loading bar at top only.

**Shared Elements:**
- **Form:** Reactive forms with Material form fields (`appearance="fill"`)
- **Alerts:** FuseAlert component (`appearance="outline"`, `[@shake]` animation on error)
- **Buttons:** Full-width primary buttons
- **Links:** Text links for navigation between auth screens
- **Logo:** Maguey logo centered above form

</details>

---

<details>
<summary>Interaction Patterns</summary>

## Notifications & Feedback

**Toast Notifications (HotToast):**
- Library: `@ngneat/hot-toast`
- Success: `toast.success('Gasto creado exitosamente')`
- Error: `toast.error('Error al guardar')`
- Observable pattern: `pipe(toast.observe({ loading, success, error }))`

**Snackbar Variants (Material):**
| Variant | Container Color | Text Color |
|---------|----------------|------------|
| `.snackbar-success` | `#0D9488` | `#FFFFFF` |
| `.snackbar-error` | `#E11D48` | `#FFFFFF` |
| `.snackbar-warning` | `#F59E0B` | `#FFFFFF` |
| `.snackbar-info` | `#2a4c3c` | `#FFFFFF` |

**Inline Alerts (FuseAlert):**
- Appearances: `border`, `fill`, `outline`, `soft`
- Types: `primary`, `accent`, `warn`, `basic`, `info`, `success`, `warning`, `error`
- Dismissible with close button
- `[@shake]` animation on error type

## Confirmation Dialogs

- Service: `FuseConfirmationService`
- Configurable: icon, title, message, action buttons, color
- Used before destructive actions (delete category, remove expense, etc.)

## Loading States

**Global Loading Bar:**
- Position: fixed, top of page
- Height: 6px
- Z-index: 999
- Modes: determinate (progress %), indeterminate (infinite animation)
- Tracks concurrent HTTP requests via URL map

**Splash Screen:**
- Full-screen overlay (z-index: 999999)
- Background: `#F8F9FA`, spinner dots: `#2a4c3c`
- 3 bouncing dots with staggered delays (-0.32s, -0.16s, 0s)
- Auto-hides on first NavigationEnd event
- Fade-out: `opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)`

**Skeleton Loading:**
- Shimmer gradient: `linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)`
- Background size: 200% 100%
- Animation: `shimmer 1.5s infinite`

**Circular Spinner:**
- `MatProgressSpinner` for in-component loading

## Empty States

**Standard Pattern:**
```
┌──────────────────────────────────┐
│                                  │
│     ┌──────────────────────┐     │
│     │  96px circle (4% bg) │     │
│     │    48px icon (hint)  │     │
│     └──────────────────────┘     │
│                                  │
│   "No hay [items] registrados"   │   <- text-lg font-medium text-default
│   "Los [items] apareceran aqui"  │   <- text-secondary
│                                  │
│       [ Crear Primer Item ]      │   <- mat-flat-button primary
│                                  │
└──────────────────────────────────┘
```

## Animations

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Splash fade-out | opacity | 400ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Drawer slide | transform, margin, width | 400ms | `cubic-bezier(0.25, 0.8, 0.25, 1)` |
| Card hover lift | transform, box-shadow | 300ms | `ease` |
| Chevron rotate | transform | 250ms | `ease` |
| Skeleton shimmer | background-position | 1500ms | `linear infinite` |
| Alert shake | — | — | Angular animation trigger |
| Spinner bounce | transform (scale) | 1000ms | `ease-in-out infinite` |

## Scrollbar Styling

- Thumb: 20px radius, 2px transparent border
- Light: `inset 0 0 0 20px rgba(0, 0, 0, 0.24)`, active: `0.37`
- Dark: `inset 0 0 0 20px rgba(255, 255, 255, 0.24)`, active: `0.37`

## Accessibility

- `@media (prefers-reduced-motion: reduce)` — disables animations
- `@media (prefers-contrast: high)` — increases contrast
- Focus-visible: `outline: 2px solid #2a4c3c; outline-offset: 2px`
- All interactive elements keyboard-navigable
- Custom focus handling (global `outline: none`, component-level focus-visible)

</details>

---

<details>
<summary>Available Themes</summary>

The app supports 8 selectable themes via Fuse config. Each theme defines primary, accent, and warn palettes with full 50-900 shade generation.

| Theme ID | Primary | Accent | Warn |
|----------|---------|--------|------|
| `theme-maguey` | `#2a4c3c` (deep green) | `#aa6d4b` (warm brown) | Red palette |
| `theme-maguey-dev` | `#2a3c4c` (navy) | `#4b6daa` (slate blue) | Red palette |
| `theme-default` | `#4f46e5` (indigo) | `#1e293b` (slate) | Red palette |
| `theme-brand` | `#2196f3` (blue) | Slate | Red palette |
| `theme-teal` | `#0d9488` (teal) | Slate | Red palette |
| `theme-rose` | `#f43f5e` (rose) | Slate | Red palette |
| `theme-purple` | `#9333ea` (purple) | Slate | Red palette |
| `theme-amber` | `#f59e0b` (amber) | Slate | Red palette |

**Active theme:** `theme-maguey` (production) / `theme-maguey-dev` (development)
**Scheme:** `light` (default), supports `dark` and `auto` (system preference)

Palette generation uses `chroma-js` in LRGB mode to interpolate 10 shades (50-900) from a single base hex color, exposed as `--fuse-primary-{hue}` CSS custom properties with RGB variants for opacity control.

</details>

---

<details>
<summary>Tech Stack & Libraries</summary>

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Angular | 18.0.0 |
| UI Components | Angular Material (MDC) | 18.x |
| CSS Framework | Tailwind CSS | 3.4.x |
| Template Base | Fuse Angular | — |
| Charts | ApexCharts (ng-apexcharts) | 3.44.0 |
| Flow Diagrams | D3.js + d3-sankey | 7.9 / 0.12 |
| Select Dropdowns | ng-select | 13.9 |
| Toast Notifications | @ngneat/hot-toast | — |
| Rich Text | Quill | 2.0 |
| Date Utilities | date-fns | 2.30 |
| Currency Formatting | currency.js | — |
| Fuzzy Search | Fuse.js | — |
| Encryption | Crypto-JS | — |
| Pagination | Custom server-table-pagination | — |
| State | Angular Signals + RxJS | 7.8 |
| Icons | Heroicons, Material Icons, Feather | SVG sprite sets |
| Fonts | Inter var (local), IBM Plex Mono (Google) | — |
| Routing | HashLocationStrategy, PreloadAllModules | — |

</details>

---

<details>
<summary>Build Guide</summary>

**Stack:** Angular 18 + Tailwind CSS 3.4 + Angular Material (MDC) + Fuse template

When building new screens or components, follow these principles:

**Build Order for a New Feature:**
1. **Route & Module/Standalone Component** — Register the route in `app.routing.ts`, create the component (prefer standalone with `OnPush` change detection).
2. **Layout Structure** — Use Tailwind grid/flex utilities. Follow the existing padding pattern: `p-4 sm:p-6 md:p-8`. Place header row with title + action buttons.
3. **Data Layer** — Create service with API calls, use Angular Signals for local state or RxJS for complex async flows.
4. **List/Table View** — Use `MatTable` with `ServerTablePagination` for paginated data, or custom card grids for visual items.
5. **Filters** — Date presets (reuse existing preset pattern), ng-select dropdowns with virtual scroll for large lists.
6. **Create/Edit Modals** — Use `MatDialog`. Reactive forms with `FormBuilder`. Form fields with `appearance="fill"`.
7. **Empty & Loading States** — Add skeleton/shimmer for initial load, centered empty state with icon + message + CTA.
8. **Charts (if needed)** — ApexCharts via `ng-apexcharts`. Use `ChartService` for data mapping.
9. **Feedback** — HotToast for success/error notifications. FuseConfirmation for destructive action confirmations.

**Color Application Rules:**
- Page backgrounds: `bg-default` (`#F8F9FA`)
- Content cards: `bg-card` (white)
- Primary actions: `color="primary"` (deep green `#2a4c3c`)
- Monetary highlights: `text-app-gold` (`#e1b66b`)
- Success indicators: `text-app-success` or `bg-app-success/10`
- Error indicators: `text-app-error` or `bg-app-error/10`
- Warning indicators: `text-app-warning` or `bg-app-warning/10`
- Secondary text/labels: `text-secondary`
- Disabled/placeholder: `text-hint`
- Borders: `border` (uses `--fuse-border` custom property)

**Component Pattern:**
- Prefer standalone components with `changeDetection: ChangeDetectionStrategy.OnPush`
- Use Angular Signals for component state
- Use `inject()` function instead of constructor injection
- All UI text in Spanish (es_MX)

**Refer to:** `ANGULAR-PATTERNS-GUIDE.md` for detailed component, service, and form patterns.

</details>
