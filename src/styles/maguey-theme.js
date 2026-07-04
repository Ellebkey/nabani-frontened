/**
 * MAGUEY 2.0 — SINGLE SOURCE OF TRUTH FOR THE THEME
 * ------------------------------------------------------------------
 * Every color in the system lives in this module. From here we generate:
 *
 *  1. The --maguey-* CSS variables on :root and body.dark
 *     (plugin ./maguey-theming.tailwind.js → Tailwind base layer)
 *  2. The Tailwind utilities (Maguey's bg-card, text-ink, bg-surface, …)
 *     via tailwind.config.js
 *  3. The Maguey custom props (--mg-bg-*, --mg-text-*)
 *     via theme.mg.customProps in tailwind.config.js
 *
 * Angular Material consumes these AT RUNTIME: themes.scss wires the
 * --mat-sys-* system tokens to the --maguey-* variables, so there is no
 * Sass mirror. The test src/styles/theme-drift.spec.ts guards the wiring.
 *
 * Design reference: docs/design_handoff_maguey/ (dark-mode.html §1,
 * sistema.html §1). CommonJS on purpose: tailwind.config.js consumes it.
 */

/** Scheme-dependent tokens (dark-mode.html §1). Key = CSS var suffix. */
const schemes = {
  light: {
    'canvas': '#F8F9FA',
    'card': '#FFFFFF',
    'ink': '#17201B',
    'ink-2': '#4E5A54',
    'ink-3': '#7C8680',
    'line': '#E7EAE8',
    'line-strong': '#D8DDDA',
    'brand-tint': '#F2EFF1',
    'brand-tint-2': '#E8E3E6',
    'teal-tint': '#E6F4F1',
    'rose-tint': '#FCE8ED',
    'amber-tint': '#FCF0DC',
    'amber': '#B45309',
  },
  dark: {
    'canvas': '#141715',
    'card': '#1C201E',
    'ink': '#ECEFED',
    'ink-2': '#A9B1AD',
    'ink-3': '#788079',
    'line': '#2A2F2C',
    'line-strong': '#39403C',
    'brand-tint': '#2E2028',
    'brand-tint-2': '#3A2833',
    'teal-tint': '#12312C',
    'rose-tint': '#3A1A22',
    'amber-tint': '#3A2C14',
    'amber': '#E8A84C', // amber text raises luminance in dark
  },
};

/** Scheme-INDEPENDENT tokens (dark-mode.html §2): identical in both modes. */
const constants = {
  'brand': '#5C3A4E',        // Nabani ciruela (grana cochinilla) — sidebar in BOTH modes
  'brand-strong': '#553548', // = mix(brand 92%, black) — hover
  'gold': '#E9A13B',         // cempasúchil — ONLY active nav + one hero amount per view
  'teal': '#0D9488',         // ONLY amounts with a + sign
  'rose': '#E11D48',         // ONLY subtraction / debt / destructive
  'amber-bright': '#F59E0B', // ONLY notification dot and alert bars
};

/** Brand text readable on dark surfaces (dark-mode.html §3). Light mauve for the plum brand. */
const brandOnDark = '#C9A6B8';

/** Modal scrim: constant, NEVER flips with the theme. */
const scrim = 'rgb(23 32 27 / 0.45)';

/** 16-color muted palette for accounts/methods/tags/categories (sistema.html §1).
    Unchanged in dark — its mid saturation works on both backgrounds.
    TS MIRROR: MAGUEY_USER_PALETTE (maguey-palette.ts) — covered by the drift test. */
const userPalette = [
  { name: 'Marino', hex: '#3B5F82' },
  { name: 'Teja', hex: '#A64F4F' },
  { name: 'Bosque', hex: '#4E8A6A' },
  { name: 'Ciruela', hex: '#6A5A8C' },
  { name: 'Ámbar', hex: '#C08A4E' },
  { name: 'Laguna', hex: '#58939C' },
  { name: 'Frambuesa', hex: '#A85D6E' },
  { name: 'Acero', hex: '#5F7386' },
  { name: 'Olivo', hex: '#8A8A4E' },
  { name: 'Arcilla', hex: '#B0806A' },
  { name: 'Ocre', hex: '#C9A45C' },
  { name: 'Salvia', hex: '#8FA98C' },
  { name: 'Malva', hex: '#7D6A85' },
  { name: 'Índigo', hex: '#56698F' },
  { name: 'Jade', hex: '#3E7C74' },
  { name: 'Grafito', hex: '#2E3A46' },
];

/** '#1C201E' → '28 32 30' (CSS var format: rgb(var(--x) / alpha)). */
function hexToTriplet(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)).join(' ');
}

/** Maguey custom props (bg-card, text-secondary, border…) derived from the theme. */
const magueyCustomProps = {
  background: {
    light: {
      'bg-app-bar': schemes.light.card,
      'bg-card': schemes.light.card,
      'bg-default': schemes.light.canvas,
      'bg-dialog': schemes.light.card,
      'bg-hover': 'rgba(0, 0, 0, 0.04)',
      'bg-status-bar': schemes.light.line,
    },
    dark: {
      'bg-app-bar': schemes.dark.card,
      'bg-card': schemes.dark.card,
      'bg-default': schemes.dark.canvas,
      'bg-dialog': schemes.dark.card,
      'bg-hover': 'rgba(255, 255, 255, 0.04)',
      'bg-status-bar': schemes.dark.canvas,
    },
  },
  foreground: {
    light: {
      'text-default': schemes.light.ink,
      'text-secondary': schemes.light['ink-2'],
      'text-hint': schemes.light['ink-3'],
      'text-disabled': '#C5CAC8',
      'border': schemes.light.line,
      'divider': schemes.light.line,
      'icon': schemes.light['ink-2'],
      'mat-icon': schemes.light['ink-2'],
    },
    dark: {
      'text-default': schemes.dark.ink,
      'text-secondary': schemes.dark['ink-2'],
      'text-hint': schemes.dark['ink-3'],
      'text-disabled': '#5A625D',
      'border': schemes.dark.line,
      'divider': schemes.dark.line,
      'icon': schemes.dark['ink-2'],
      'mat-icon': schemes.dark['ink-2'],
    },
  },
};

module.exports = { schemes, constants, brandOnDark, scrim, userPalette, hexToTriplet, magueyCustomProps };
