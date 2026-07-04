import * as fs from 'fs';
import * as path from 'path';

import { MAGUEY_USER_PALETTE } from '../app/modules/shared/services/maguey-palette';

 
// eslint-disable-next-line @typescript-eslint/no-require-imports -- the theme source is CJS on purpose (consumed by tailwind.config.js)
const theme = require('./maguey-theme');

/**
 * Theme drift guard (see THEME.md):
 * maguey-theme.js is the single source. Angular Material now consumes it at
 * RUNTIME (themes.scss defines --mat-sys-* tokens from the --maguey-* vars,
 * so there is no Sass color mirror anymore) — these tests guard that wiring
 * and the one mirror that remains: the TS muted palette (MAGUEY_USER_PALETTE).
 */
describe('Theme drift guard', () => {
  const themesScss = fs.readFileSync(
    path.resolve(__dirname, '../@maguey/styles/themes.scss'),
    'utf8',
  );

  it('Material system tokens are wired to the maguey variables', () => {
    // The tokens Material components actually read for surfaces and inks —
    // each must reference the runtime vars, never a hex literal.
    const required: Record<string, string> = {
      '--mat-sys-surface': 'rgb(var(--maguey-card))',
      '--mat-sys-background': 'rgb(var(--maguey-canvas))',
      '--mat-sys-on-surface': 'rgb(var(--maguey-ink))',
      '--mat-sys-on-surface-variant': 'rgb(var(--maguey-ink-2))',
      '--mat-sys-primary': 'rgb(var(--maguey-brand))',
      '--mat-sys-error': 'rgb(var(--maguey-rose))',
      '--mat-sys-outline': 'rgb(var(--maguey-line-strong))',
      '--mat-sys-outline-variant': 'rgb(var(--maguey-line))',
    };
    for (const [token, value] of Object.entries(required)) {
      expect(themesScss).toContain(`${token}: ${value};`);
    }
  });

  it('themes.scss carries no Material color mirror (no surface hex literals)', () => {
    // Colors flow from maguey-theme.js at runtime; a hex surface in the Sass
    // means someone reintroduced a mirror that will drift.
    const surfaces = [theme.schemes.dark.card, theme.schemes.dark.canvas, theme.schemes.light.canvas];
    for (const hex of surfaces) {
      expect(themesScss.toUpperCase()).not.toContain(hex.toUpperCase());
    }
  });

  it('the TS muted palette mirrors the theme module', () => {
    expect(MAGUEY_USER_PALETTE.map(color => color.hex)).toEqual(
      theme.userPalette.map((color: { hex: string }) => color.hex),
    );
    expect(MAGUEY_USER_PALETTE.map(color => color.name)).toEqual(
      theme.userPalette.map((color: { name: string }) => color.name),
    );
  });

  it('every token is a valid hex color', () => {
    const all = [
      ...Object.values(theme.schemes.light),
      ...Object.values(theme.schemes.dark),
      ...Object.values(theme.constants),
    ] as string[];
    all.forEach(hex => expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });

  it('maguey custom props derive from the scheme tokens', () => {
    expect(theme.magueyCustomProps.background.dark['bg-card']).toBe(theme.schemes.dark.card);
    expect(theme.magueyCustomProps.background.dark['bg-default']).toBe(theme.schemes.dark.canvas);
    expect(theme.magueyCustomProps.foreground.dark['text-secondary']).toBe(theme.schemes.dark['ink-2']);
    expect(theme.magueyCustomProps.foreground.light.border).toBe(theme.schemes.light.line);
  });
});
