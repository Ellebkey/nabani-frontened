// @ts-check
const eslint = require("@eslint/js");
const { defineConfig, globalIgnores } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = defineConfig([
  globalIgnores([
    "frontend/**",
    "coverage/**",
    "node_modules/**",
    ".angular/**",
    "docs/**",
    "playwright-report/**",
    "test-results/**",
  ]),

  // App code: full rule set aligned with ANGULAR-PATTERNS-GUIDE.md
  {
    files: ["src/app/**/*.ts", "src/styles/**/*.ts", "e2e/**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: "app", style: "camelCase" },
      ],
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: ["app", "mg", "nb", "auth"], style: "kebab-case" },
      ],
      "@angular-eslint/prefer-inject": "error",
      "@angular-eslint/prefer-on-push-component-change-detection": "error",
      "@angular-eslint/prefer-standalone": "error",
      "@angular-eslint/no-empty-lifecycle-method": "error",
      // the codebase predates TS strict — don't fight it from lint
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-indexed-object-style": "off",
      "@typescript-eslint/no-inferrable-types": "off",
    },
  },

  // Layout shells predate the selector convention (layout, user, draft-notification)
  {
    files: ["src/app/layout/**/*.ts"],
    rules: {
      "@angular-eslint/component-selector": "off",
    },
  },

  // Maguey template code: keep it compiling, don't impose app conventions
  {
    files: ["src/@maguey/**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // The engine still uses a handful of pragmatic assertions in the
      // timing-sensitive navigation/scrollbar code — keep as warnings so
      // new ones are visible without blocking.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Plain JS config files
  {
    files: ["*.js", "src/styles/*.js"],
    extends: [eslint.configs.recommended],
    languageOptions: {
      globals: { module: "readonly", require: "readonly", __dirname: "readonly", process: "readonly" },
    },
  },

  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {
      // Accessibility debt (94 findings at adoption, 2026-07): surfaced as
      // warnings until the dedicated a11y pass — do NOT silence, fix and
      // promote back to errors.
      "@angular-eslint/template/label-has-associated-control": "warn",
      "@angular-eslint/template/click-events-have-key-events": "warn",
      "@angular-eslint/template/interactive-supports-focus": "warn",
      "@angular-eslint/template/role-has-required-aria": "warn",
    },
  },
]);
