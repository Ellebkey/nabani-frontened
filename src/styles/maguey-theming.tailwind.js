/**
 * Tailwind plugin that emits the Maguey theme CSS variables into the base layer:
 *
 *   :root            → light tokens + constants (brand, gold, teal, rose…)
 *   body.dark, .dark → redefinition of the scheme-dependent tokens
 *
 * These blocks used to be hand-written in maguey-tokens.scss; they are now
 * generated from maguey-theme.js so the theme has ONE single source.
 */
const plugin = require('tailwindcss/plugin');
const { schemes, constants, brandOnDark, hexToTriplet } = require('./maguey-theme');

const toVars = (tokens) => Object.fromEntries(
  Object.entries(tokens).map(([name, hex]) => [`--maguey-${name}`, hexToTriplet(hex)]),
);

module.exports = plugin(({ addBase }) => {
  addBase({
    ':root': {
      ...toVars(schemes.light),
      ...toVars(constants),
      '--maguey-brand-on-dark': hexToTriplet(brandOnDark),
    },
    // `body .dark` covers dark subtrees inside a light body (e.g. the sidebar)
    'body.dark, body .dark': toVars(schemes.dark),
    // Light islands: subtrees that stay light under a dark scheme (auth screens)
    'body .light, .light': toVars(schemes.light),
    // Brand green is unreadable on dark surfaces: all brand text uses its light version
    '.dark .text-brand, .dark mg-pill.brand, .dark mg-tile.neutral, .dark mg-empty-state .text-brand': {
      color: `${brandOnDark} !important`,
    },
    // …but inside a light island the normal brand green applies again
    '.light .text-brand': {
      color: `rgb(${hexToTriplet(constants.brand).split(' ').join(', ')}) !important`,
    },
  });
});
