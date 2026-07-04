<p align="center">
  <img src="./maguey-banner.png" alt="Maguey" width="400">
</p>

<h1 align="center">Maguey - Frontend</h1>

<p align="center">
  Web client for <strong>Maguey</strong>, a personal finance tracking application.<br/>
  Built with Angular 18, Angular Material, and Tailwind CSS.
</p>

---

## Features

- **Angular 18** — Standalone components, signals, and OnPush change detection
- **Angular Material** — Rich UI component library
- **Tailwind CSS** — Utility-first styling
- **ApexCharts & D3** — Interactive financial charts and reports
- **Receipt scanning** — OCR-powered expense entry from photos
- **Multi-user** — Secure, user-scoped data access
- **Spanish UI** — Full Spanish language interface

## Prerequisites

- [Node.js](https://nodejs.org/) v20.9+
- [Angular CLI](https://angular.io/cli) v18+

## Quick Start

### 1. Clone the repository
```sh
git clone https://github.com/username/myexpenses-frontend.git
cd myexpenses-frontend
```

### 2. Install dependencies
```sh
npm install
```

### 3. Start the development server
```sh
npm start
```

Navigate to `http://localhost:4200/`. The application will automatically reload on source file changes.

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server at `localhost:4200` |
| `npm run build` | Production build to `dist/` |
| `npm run test` | Run unit tests |

## Project Structure

```
src/app/
├── core/                  # Auth, navigation, user service, interceptors
├── modules/
│   ├── admin/             # Admin panels (accounts, categories, tags, payment methods)
│   ├── accounts/          # Account management and ledger views
│   ├── auth/              # Login and authentication screens
│   ├── expenses/          # Expense creation, receipt scanning, article management
│   ├── incomes/           # Income tracking and management
│   ├── inventory/         # Article and inventory management
│   ├── reports/           # Cash flow charts and financial reports
│   ├── profile/           # User profile
│   └── shared/            # Shared interfaces, services, and components
└── layout/                # App shell, sidebar, toolbar
```

## Tech Stack

| Technology | Version |
|------------|---------|
| Angular | 18.0.1 |
| Angular Material | 18.0.1 |
| Tailwind CSS | 3.4.3 |
| ApexCharts | 3.44.0 |
| D3 | 7.9.0 |
| TypeScript | 5.4.5 |

## Theme

Maguey uses a custom theme inspired by natural earth tones:

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#2a4c3c` | Main brand color |
| Accent | `#aa6d4b` | Terracotta highlights |
| Secondary | `#638569` | Sage accents |
| Golden | `#e1b66b` | Warm details |
| Background | `#f7f1e4` | Page background |
| Surface | `#fcfaf5` | Card surfaces |

## Development

Branch from `master` and open a PR for review. Commit prefixes: `feat:`, `fix:`, `refactor:`.
