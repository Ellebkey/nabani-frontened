# Maguey Backend — Architecture & "Add-a-Resource" Reference

> Analyzed from `/home/jbarranco/Proyectos/maguey/maguey-backend` on 2026-07-04.
> This is the modern base/template for **Nabani**. Maguey is a personal-finance
> ("MyExpenses") API: Node 24 + TypeScript 6 + Express 5 + Sequelize 6 + PostgreSQL 16 + Redis.
> Package name is still `myexpenses-ellebkey-app` (v3.4.0) — the codebase was renamed to
> "Maguey" but internal identifiers/logger labels still say `expenses`/`myexpenses`.

## 0. Authoritative docs already in the repo

The repo ships three long guides that encode the conventions — read them alongside this report:

- `docs/MODULE_DEVELOPMENT_GUIDE.md` (~1600 lines) — the canonical "6-layer architecture" + a
  **Step-by-Step Module Creation** section (model → DTO → validation → service → controller →
  route → register in sequelize → register in DbModels interface). This is the real recipe.
- `docs/UNIT_TESTS_GUIDELINES.md` — controller unit-test conventions (mock services, factories).
- `docs/INTEGRATION_TESTS_GUIDELINES.md` — supertest + real Postgres/Redis integration tests.

---

## 1. Architecture & Layering

### 1.1 Folder structure (`src/`, 271 files)

```
src/
├── index.ts              # HTTP server bootstrap (creates DB + Redis, starts http.createServer)
├── index.route.ts        # Auto-loads every file in src/routes and mounts under /api
├── config/               # config.ts (env+joi), express.ts, sequelize.ts, redis-config.ts, logger.ts, swagger.config.ts
├── routes/               # 18 route classes (one per resource) — thin, wire URL→controller + guards
├── controllers/          # 18 controllers — validate input, call service, catch→next(err)
├── services/             # 27 services — ALL business logic + DB access (singletons)
├── models/               # 24 Sequelize model factories + base.model.ts
├── validations/          # Joi schemas registered into a global registry
├── interfaces/           # TypeScript DTOs + the DbModels type + express.d.ts augmentation
├── queries/              # Raw SQL strings for reporting/aggregation (5 files)
├── middlewares/          # auth (JWT), api-key-auth, role, rate-limit
├── errors/               # AppError hierarchy + Express error middleware
├── utils/                # transaction, validation registry, user-context guards, logger, date
├── scripts/              # api-key.ts CLI
├── docs/                 # Swagger JSDoc: paths/, schemas/, components/ (dev-only)
└── test/                 # factories/, helpers/, unit/mocks/, integration/
db-migrations/            # sequelize-cli: migrations/, models/index.js, config/config.json, manual-scripts/
```

Layering is a strict **6-layer flow**:
`route → (auth/role/validation middleware) → controller → service → model (Sequelize) → DB`.
Controllers never touch `db.*` directly; services never touch `req`/`res`. DTOs cross every boundary.

### 1.2 TypeScript config (`tsconfig.json`)

- `target/lib: es2024`, `module/moduleResolution: nodenext`, `strict: true`, `noUncheckedIndexedAccess: true`.
- `rootDir: ./src`, `outDir: ./release`. Build = `tsc && tsc-alias` (npm `build`).
- **Path aliases** (must be duplicated in 3 places when adding a new top-level dir):
  `@/*`, `@config/*`, `@controllers/*`, `@errors/*`, `@queries/*`, `@interfaces/*`,
  `@middlewares/*`, `@models/*`, `@routes/*`, `@services/*`, `@utils/*`, `@validations/*`.
  - `tsconfig.json` `paths` (for tsc) — resolved at build by **tsc-alias** into the emitted `.js`.
  - `jest.config.js` + `jest.integration.config.js` `moduleNameMapper` (for tests).
  - At runtime in dev/test, `tsx` reads the tsconfig paths directly.

### 1.3 Boot sequence (`src/index.ts`)

```ts
const db = new SequelizeDB();
const dbRedis = new RedisDB();
void db.initDataBase();          // connects Postgres, builds all models, wires associations, sync()
void dbRedis.initRedis();        // connects node-redis (RESP:3)
const { app } = new ExpressServer();   // middleware + swagger + routes
const server = http.createServer(app);
server.listen(normalizePort(process.env.PORT || 3000));
```

`ExpressServer` (`src/config/express.ts`) order: `compression → helmet → cors(origin=FRONTEND_URL,
credentials) → urlencoded → json → cookieParser → (dev/test http logging) → swagger(dev only) →
/api (+ apiRateLimiter unless test) → converterErr → notFound → errorMiddleware`.
Note `app.set('query parser', 'extended')` to keep Express-4 nested query parsing under Express 5.

### 1.4 Config / env loading (`src/config/config.ts`)

`dotenv` loads `.env`, then a **Joi schema validates `process.env`** and throws on boot if invalid.
Exports a typed `envConfig` object (`env`, `port`, `jwtSecret`, `frontendUrl`, `resend{}`, `gemini{}`,
`sql{}`, `MAX_POOL`, `MIN_POOL`). Required vars: `JWT_SECRET`, `SQL_HOST/DB/USER/PASSWORD`.
Optional-with-defaults: `PORT=4040`, `RESEND_*`, `GEMINI_*`, `FRONTEND_URL`. See `.env.example`.

---

## 2. Add-a-Resource Recipe (traced end-to-end on **Account**)

To add resource `Foo` you create/modify **7 files** and touch **2 registries**. Below is the exact
pattern, cited from the Account resource.

### Step 1 — Model `src/models/{foo}.model.ts`

Class-based Sequelize 6 with `InferAttributes`. Extends `BaseModelInstance` (`src/models/base.model.ts`).
Factory function that calls `.init()` and returns the class; `associate` wires relations.
`underscored: true` maps camelCase attrs → snake_case columns; each field can also set `field:`.

```ts
// src/models/account.model.ts
export class AccountInstance extends BaseModelInstance<AccountInstance> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare currentAmount: number;
  declare disable: CreationOptional<boolean>;
  declare ownerId: ForeignKey<string>;
}

const AccountFactory = (sequelize: Sequelize): ModelClass<AccountInstance> => {
  AccountInstance.init(
    {
      id: { type: DataTypes.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'),
            allowNull: false, primaryKey: true, unique: true },
      name: { type: DataTypes.STRING(50), allowNull: false },
      currentAmount: { field: 'current_amount', type: DataTypes.DECIMAL(10, 3),
                       allowNull: false, defaultValue: 0 },
      disable: { field: 'disable', type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      ownerId: { field: 'owner_id', type: DataTypes.UUID, allowNull: false },
    },
    { sequelize, tableName: 'account', underscored: true, timestamps: false, modelName: 'Account' },
  );

  AccountInstance.associate = (models) => {
    AccountInstance.belongsTo(models.User, { as: 'user', foreignKey: 'owner_id' });
    AccountInstance.hasMany(models.AccountSection, { as: 'sections', foreignKey: 'account_id' });
  };
  return AccountInstance as ModelClass<AccountInstance>;
};
export default AccountFactory;
```

Conventions: UUID PKs use `Sequelize.literal('uuid_generate_v4()')`; some tables use auto-increment
INTEGER PKs (Expense, Recipient, Article, ApiKey, ReceiptDraft). `timestamps: false` when no
created/updated columns, otherwise declare `createdAt/updatedAt` fields mapped to `created_at/updated_at`.
Ownership column is either `owner_id` (Account) or `user_id` (Expense, Article, Tag, …).
Associations reference **snake_case FKs** (`foreignKey: 'user_id'`). `DataTypes.VIRTUAL` computed
getters exist (see `expense.model.ts` `calculateAmount`), and many-to-many uses `through:` join models
(`ExpenseItem`, `ExpenseTag`).

### Step 2 — DTOs `src/interfaces/{foo}.dto.ts`

Plain TS interfaces: `Create*Dto`, `Update*Dto`, the read `*Dto`, and a `*FilterDto extends BaseFilterDto`.
Reuse `BaseListDto<T>` / `BaseFilterDto` / `PaginationDto` from `src/interfaces/base.dto.ts`.

```ts
export interface CreateAccountDto { name: string; currentAmount: string; colorPalette?: string; }
export interface UpdateAccountDto { name?: string; colorPalette?: string; disable?: boolean; }
export interface AccountDto { id: string; name: string; currentAmount: number; disable: boolean; }
export type AccountListDto = BaseListDto<AccountDto>;
export interface AccountFilterDto extends BaseFilterDto { includeDisabled?: boolean; }
```

### Step 3 — Validation `src/validations/{foo}.validation.ts`

Joi 18 schemas kept in a plain object and **registered by name** into a global registry via
`registerSchemas()` (`src/utils/validation.util.ts`). The file is imported for side-effects by the
route (`import '@validations/account.validation';`). Shared schemas `entityId` (numeric) and
`entityUuid` (UUID) live in `src/validations/shared.validation.ts`.

```ts
const accountValidationSchemas = {
  createAccount: Joi.object({
    name: Joi.string().required().min(1).max(50).trim(),
    currentAmount: Joi.number().required(),
    colorPalette: Joi.string().max(50).trim().allow(null, ''),
  }).unknown(false),
  updateAccount: Joi.object({ name: Joi.string().min(1).max(50).trim(), disable: Joi.boolean() }).min(1),
  accountFilter: Joi.object({ offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(100).default(50),
    includeDisabled: Joi.boolean().default(false) }),
};
registerSchemas(accountValidationSchemas);
export default accountValidationSchemas;
```

`validateDto<T>('schemaName', data)` runs `{ abortEarly:false, stripUnknown:true, convert:true }`
and throws a `ValidationError` (400) whose details list `{field, message}`. There is **no** per-route
validation middleware — validation happens **inside controllers** by schema name.

### Step 4 — Service `src/services/{foo}.service.ts`

Singleton class (`export default new FooService()`) holding all business logic + `db.*` access.
Injects other services in the constructor. Uses `withTransaction()` for writes, throws typed errors,
and maps entities → DTOs with a private `toFooDto`. Ownership is enforced in every query
(`where: { id, ownerId }`).

```ts
class AccountService {
  findById = async (id: string, ownerId: string): Promise<AccountDto> => {
    const account = await db.Account.findOne({ where: { id, ownerId } });
    if (!account) throw new NotFoundError('Account', id);
    return this.toAccountDto(account);
  };

  create = async (dto: CreateAccountDto, ownerId?: string): Promise<AccountDto> => {
    if (!ownerId) throw new ForbiddenError('User authentication required to create an account');
    return withTransaction(async (transaction) => {
      const account = await db.Account.create({ ...dto, ownerId }, { transaction });
      // ...side effects (e.g. opening-balance ledger entry) share the same transaction...
      logger.info('Account created', { accountId: account.id, ownerId });
      return this.toAccountDto(account);
    });
  };

  private toAccountDto = (a: AccountInstance): AccountDto =>
    ({ id: a.id, name: a.name, currentAmount: +a.currentAmount, disable: a.disable });
}
export default new AccountService();
```

Reporting/aggregation uses raw SQL from `src/queries/*.queries.ts` run via
`db.sequelize.query(sql, { replacements: { startDate, endDate, userId } })`.

### Step 5 — Controller `src/controllers/{foo}.controller.ts`

Singleton class of arrow-fn handlers. Each: `requireUserId(req.user?.id)` → `validateDto(...)` →
call service → `res.json()`; wrap in try/catch and `next(error)`. Controllers are **thin** and hold
no logic. Status codes: create → 201, delete → 204, else 200.

```ts
class AccountController {
  create = async (req, res, next) => {
    try {
      const userId = requireUserId(req.user?.id);
      const dto = validateDto<CreateAccountDto>('createAccount', req.body);
      const account = await this.accountService.create(dto, userId);
      return res.status(201).json(account);
    } catch (error) { return next(error); }
  };
  getById = async (req, res, next) => {
    try {
      const userId = requireUserId(req.user?.id);
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      return res.json(await this.accountService.findById(id, userId));
    } catch (error) { return next(error); }
  };
}
export default new AccountController();
```

`requireUserId / requireSelf / requireSelfOrAdmin / requireAdmin` live in
`src/utils/user-context.util.ts` and throw `ForbiddenError` when the caller lacks access.

### Step 6 — Route `src/routes/{foo}.route.ts`

Class that builds an Express `Router`, applies the JWT guard via `.all(this.canAccess)`, and maps
verbs to controller methods. Imports the validation file for its side-effect registration.
**`export default new FooRoute().router`** — the router instance is what `index.route.ts` auto-mounts.

```ts
export class AccountRoute {
  public canAccess = new Auth().checkAuth;   // JWT middleware
  public router: Router = Router();
  public constructor() { this.init(); }
  private init(): void {
    this.router.route('/accounts').all(this.canAccess)
      .get(accountController.list).post(accountController.create);
    this.router.route('/accounts/:id').all(this.canAccess)
      .get(accountController.getById).put(accountController.update).delete(accountController.delete);
  }
}
export default new AccountRoute().router;
```

**Route auto-loading** (`src/index.route.ts`): reads every file in `src/routes/` and does
`this.router.use('/', require('./routes/<file>').default)`. **No central route registry** — dropping a
`*.route.ts` file in is enough. (Ext is `.ts` in dev/test, `.js` in prod.) All mounted under `/api`.
Static/specific paths (`/accounts/transfer`) must be declared **before** `/:id` to avoid capture.

### Step 7 — Register the model (2 places)

Unlike routes, models are **not** auto-loaded. You must edit two files:

1. `src/config/sequelize.ts` — import the factory and add `db.Foo = FooFactory(sequelize);` inside
   `initDataBase()` (before the association loop, which calls `.associate(db)` on each model).
2. `src/interfaces/sequelize.interface.ts` — import `FooInstance` and add
   `Foo: ModelClass<FooInstance>;` to the `DbModels` interface so `db.Foo` is typed everywhere.

### Step 8 — Migration `db-migrations/migrations/<timestamp>-create-foo.js`

Plain sequelize-cli JS migration with `up`/`down` (snake_case columns, explicit indexes, FKs with
`references/onDelete`). Run with `npm run db:migrate`. `sync()` also runs at boot but migrations are
the source of truth for prod. See §3.

### Step 9 (optional) — Swagger + tests

- `src/docs/paths/{foo}.paths.ts` and `src/docs/schemas/{foo}.schemas.ts` — JSDoc `@swagger` blocks.
- `src/controllers/__tests__/{foo}.controller.test.ts` — unit test (mock the service).
- `src/test/integration/{foos}/{foos}.integration.test.ts` + `src/test/factories/{foo}.factory.ts`.

---

## 3. Data Layer

### 3.1 Model style
Sequelize 6 **class + `.init()` factory** pattern (not `sequelize-typescript` decorators, despite
`experimentalDecorators` being on). `base.model.ts` provides `BaseModelInstance<T>` (typed with
`InferAttributes`/`InferCreationAttributes`) and the `ModelClass<T>`/`ModelFactory<T>` helper types.
Each factory calls `Model.init()`, sets `associate`, returns the class.

### 3.2 Registration & association wiring
`SequelizeDB.initDataBase()` (`src/config/sequelize.ts`) builds one `Sequelize` instance, calls every
factory to populate a module-level `export const db` (typed `DbModels`), then loops all models calling
`model.associate(db)`, then `authenticate()` + `sync()`. `db` is imported by services as
`import { db } from '@config/sequelize'` and used as `db.Account`, `db.sequelize`, etc.

### 3.3 Migrations (`db-migrations/`, driven by `.sequelizerc`)
`.sequelizerc` points sequelize-cli at `db-migrations/{config/config.json, models, seeders, migrations}`.
`db-migrations/models/index.js` is the classic sequelize-cli auto-loader (separate from the app's TS
models — used only by the CLI). Migrations are timestamped JS files; ~35 exist. Example new-table:

```js
// db-migrations/migrations/20260630120000-create-api-keys.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_keys', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false,
                 references: { model: 'user', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      key_hash: { type: Sequelize.STRING(64), allowNull: false },
      scopes: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('api_keys', ['key_hash'], { name: 'idx_api_keys_key_hash', unique: true });
  },
  async down(queryInterface) { await queryInterface.dropTable('api_keys'); },
};
```

npm scripts: `db:migrate`, `db:migrate:undo`, `db:migrate:undo:all`, `db:migrate:status`,
`db:seed`, `db:seed:undo`. **There is no `seeders/` directory currently** — no seed data ships.
`db-migrations/manual-scripts/*.sql` holds one-off SQL (ledger backfill, category normalization).
`config/config.json` holds hard-coded dev/prod DB creds (⚠️ passwords committed — replace for Nabani).

### 3.4 Full model list (24, from `src/config/sequelize.ts`)
`User, UserConfig, Account, AccountSection, AccountLedger, Article, ArticleRecord, Category,
Subcategory, Expense, ExpenseItem, Income, PaymentMethod, Recipient, RecurrentExpense, Tag, ExpenseTag,
ReceiptDraft, ApiKey, Partnership, PartnershipMember, PartnershipInvite, PartnershipExcludedCategory,
PartnershipBudget`.

### 3.5 Route groups (18, from `src/routes/`)
`auth, user, account, account-section, credit-card, payment-method, category, subcategory, article,
tag, expense, income, recipient, purchased-item, partnership, partnership-budget,
partnership-shared-view, receipt-draft`.
(`credit-card` and `purchased-item` are read/report views over payment-methods and expense-items —
they have controller/service/route but no dedicated model.)

---

## 4. Auth & Authorization

### 4.1 JWT flow (`src/services/jwt.service.ts`, `auth.service.ts`)
- **Access token**: `jsonwebtoken`, HS256, `JWT_SECRET`, **15-min** expiry. Payload =
  `{ id, username, roles }` (`JWTPayload`).
- **Refresh token**: 48 random bytes, only the SHA-256 hash stored **in Redis** under
  `refresh_token:<hash>` (TTL 8h normal / 30d "remember me") plus a per-user set
  `refresh_tokens_user:<userId>` for bulk revoke. Rotated on every refresh.
- Passwords hashed with **bcrypt** (10 rounds). Login requires `emailVerified`.
- Email verification + password reset use Redis one-time tokens (`email_verify:*`, `password_reset:*`)
  and send mail via **Resend** (`email.service.ts`). Endpoints in `auth.route.ts`.

### 4.2 JWT middleware (`src/middlewares/auth.ts`)
`new Auth().checkAuth` reads `Authorization` header, `jwtService.validateToken`, sets `req.user`,
else `next(new UnauthorizedError(...))` (401 so the frontend can trigger refresh). Applied per-router
via `.all(this.canAccess)`.

### 4.3 Roles / RBAC (`src/middlewares/role.middleware.ts`)
`requireRole(...roles)` factory — used **after** `checkAuth`, checks `req.user.roles`, throws
`ForbiddenError` (403). Roles seen: **`free`** (default on register), **`premium`**, **`admin`**,
(`user` in tests). Example gate: `.all(this.canAccess, requireRole('premium','admin'))` on
`/receipt-drafts`. Fine-grained ownership checks use the `user-context.util.ts` guards
(`requireSelfOrAdmin`, `requireAdmin`).

### 4.4 API keys (`src/middlewares/api-key-auth.middleware.ts`, `api-key.service.ts`, `scripts/api-key.ts`)
For server-to-server / external integrations (e.g. n8n). Key format `mgk_live_<base64url>`; only the
SHA-256 hash + a visible `key_prefix` stored in the `api_keys` table; plaintext shown **once**.
`apiKeyOrJwt({ scope, roles })` is a **combined guard**: if `X-API-Key` present → authenticate the key,
check it carries the required **scope** (e.g. `drafts:write`), resolve its user onto `req.user`
(role gate bypassed); else fall back to JWT + role check. Sets `req.auth = { method, apiKeyId, scopes }`
(typed via `src/interfaces/express.d.ts`). Keys are revocable/expiring/rotatable. Managed by the CLI:
`npm run apikey -- generate|list|revoke|rotate ...`.

### 4.5 Rate limiting (`src/middlewares/rate-limit.middleware.ts`)
`express-rate-limit`. `apiRateLimiter` = 100 req/min on all `/api` (mounted in `express.ts`, **skipped
in test**). `authRateLimiter` = 10 req/15 min on auth endpoints (no-op in test). 429 responses use the
same `{ error: { code, message, status } }` envelope as the error middleware.

---

## 5. Validation (Joi 18)

- Schemas live in `src/validations/*.validation.ts`, grouped in a plain object, **registered by name**
  into a global registry (`registerSchemas` in `src/utils/validation.util.ts`).
- Validation files are imported for side-effects by their route (and `shared.validation.ts` is imported
  once by `index.route.ts`).
- Controllers call `validateDto<T>('name', data)` → returns typed, sanitized value or throws
  `ValidationError`. Options: `abortEarly:false, stripUnknown:true, convert:true`.
- Shared param schemas: `entityId` (positive int) and `entityUuid` (UUID). Body schemas use
  `.unknown(false)` (reject extras) or `.min(1)` (updates require ≥1 field). Query/filter schemas set
  `.default()` for pagination.

---

## 6. Cross-Cutting Concerns

- **Errors** (`src/errors/`): `AppError(code, message, statusCode, context)` base + subclasses
  `NotFoundError(404)`, `ConflictError(409)`, `ValidationError(400)`, `BadRequestError(400)`,
  `BusinessRuleError(422)`, `UnauthorizedError(401)`, `ForbiddenError(403)`, `InternalServerError(500)`,
  `ServiceUnavailableError(503)`, `DatabaseConstraintError(409)`. Middleware chain: `converterErr`
  normalizes unknown/Sequelize/Multer errors → `AppError`, then `errorMiddleware` emits
  `{ error: { code, message, status, details?, stack?(dev) } }` and logs via winston; `notFound`
  handles unmatched routes.
- **Logging** (`src/config/logger.ts`): **winston**, level `verbose`. Dev = colorized human format;
  prod = structured JSON. HTTP request logging middleware in dev/test. Label is `expenses-api`.
- **Redis** (`src/config/redis-config.ts`): node-redis v6 `createClient({ RESP: 3 })`. Used for refresh
  tokens, email-verify/reset tokens, and a `default_account_<userId>` cache. Singleton `redisClient`.
- **Email** (`src/services/email.service.ts`): **Resend**; gracefully no-ops if `RESEND_API_KEY` unset.
  Sends Spanish HTML verification / reset emails linking to `FRONTEND_URL`.
- **Swagger** (`src/config/swagger.config.ts`): `swagger-jsdoc` + `swagger-ui-express` at `/api-docs`,
  **dev only**. Specs assembled from JSDoc comments in `src/docs/{schemas,paths,components}/*.ts`.
- **File uploads** (**multer**): only in `receipt-draft.route.ts` — `memoryStorage`, 10 MB limit,
  image-only `fileFilter`, `upload.single('receipt')`. Multer errors mapped to 400 by `converterErr`.
- **AI** (`@google/genai`, `src/services/gemini-vision.service.ts`): Gemini vision/text OCR that turns a
  receipt photo **or** free text into a structured draft (typed `responseSchema`, category catalog
  injected into the prompt). Config: `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-2.5-flash-lite`).
  Fuzzy article matching via `fuse.js` (`fuzzy-match.service.ts`). Flow: `POST /receipt-drafts/scan`
  (image) or `/from-text` → Gemini → staged `receipt_drafts` (JSONB) → `/confirm` → real expense.

---

## 7. Testing

Two Jest projects, both `ts-jest`, both with the alias `moduleNameMapper`:

- **Unit** (`jest.config.js`, `npm run test:unit`): matches `**/__tests__/**/*.ts` and `*.test.ts`,
  ignores `src/test/integration/`. `setupFilesAfterEnv: src/test/unit/setup.ts`. Pattern: **mock the
  service, validation.util, user-context.util** (via `jest.mock(... => require('../../test/unit/mocks/...')`),
  build fake `req/res/next` with `src/test/helpers/mock-express.ts`, assert status/json/next. DTOs built
  with `src/test/factories/*.factory.ts`. Controllers, middlewares, and errors have unit tests.
- **Integration** (`jest.integration.config.js`, `npm run test:integration --runInBand`): matches
  `src/test/integration/**/*.integration.test.ts`. `setupFiles: env-setup.ts` loads **`.env.test`**
  before imports; `setupFilesAfterEach: setup.ts` mocks only the logger, then `beforeAll` calls
  `initTestDatabase()` (`db.sequelize.sync({ force: true })`) and connects Redis. Tests hit a **real
  Postgres test DB** (`myexpenses_test`) + Redis through the real Express app (`app.helper.ts` caches
  `new ExpressServer().app`) via **supertest**. Helpers: `db.helper.ts` (init/clean via `TRUNCATE …
  CASCADE`/close), `auth.helper.ts` (`createAuthenticatedUser` mints a real user + JWT). `maxWorkers:1`,
  15 s timeout. Integration suites exist for auth, articles, categories, credit-cards, expenses,
  partnerships, payment-methods, recipients, subcategories, tags.
- `npm run test:all` runs both. `test:coverage` for coverage. Coverage excludes `index.ts`, `*.d.ts`,
  tests.

Test DB infra: `docker-compose.yml` (Postgres 16-alpine + Redis 7-alpine) with
`docker/init.sql` and `docker/init-test-db.sh` provisioning the main + test databases.

---

## 8. Domain — Maguey vs. a Nutrition-Clinic App (Nabani)

**Maguey is a personal-finance / expense tracker.** Core domain objects:

| Maguey concept | Meaning |
|---|---|
| `User` / `UserConfig` | app user (roles `free`/`premium`/`admin`), default account |
| `Account` / `AccountSection` / `AccountLedger` | money accounts, "apartados" sub-buckets, double-entry ledger |
| `Expense` / `ExpenseItem` | a purchase and its line items |
| `Income` | money in |
| `Category` / `Subcategory` | expense classification (with tier gating) |
| `Article` / `ArticleRecord` | catalog of purchasable products + price history |
| `Recipient` | payee/vendor |
| `PaymentMethod` (+ credit-card views) | cash/card/wallet |
| `Tag` / `ExpenseTag` | free-form labels on expenses |
| `ReceiptDraft` | OCR-staged receipt awaiting confirmation |
| `Partnership*` | shared/household budgets between users |
| `RecurrentExpense` | scheduled recurring charges |
| `ApiKey` | external integration keys |

### Overlap with a nutrition-clinic domain (patients, menus, ingredients, sales, payments, packages)

**Low domain overlap, very high architectural overlap.** None of Maguey's *business entities* map to a
clinic (there are no patients, appointments, menus, ingredients, body measurements, or clinical notes).
The value is the **template/skeleton**, not the finance domain:

- **Directly reusable as-is**: the entire auth stack (JWT + refresh + email verify + password reset +
  RBAC), API-key system, rate limiting, error hierarchy + middleware, Joi validation registry,
  transaction util, logger, Redis wiring, Swagger setup, the auto-loading route layer, the 6-layer
  add-a-resource recipe, and the full unit+integration test harness. `User`/roles, `ApiKey`,
  and multi-tenant `user_id` scoping transfer 1:1.
- **Partial conceptual analogues** (reuse the *pattern*, rename the entity):
  - `Article`/`ArticleRecord` (catalog + price history) ≈ **Ingredients** or **menu items / products**.
  - `Category`/`Subcategory` ≈ food groups / service categories.
  - `Expense`+`ExpenseItem` (header + lines, totals, payment method) ≈ **Sales / orders** (a sale header
    with line items). The money math, ledger, and DECIMAL handling are reusable for **payments**.
  - `Account`/`AccountLedger` (double-entry) ≈ clinic **cash/payments accounting**.
  - `Partnership*` (multi-user sharing) ≈ multi-practitioner / clinic-staff sharing, if needed.
  - Recurring-charge + Gemini receipt scanning are finance-specific and likely dropped, though the
    Gemini vision plumbing could be repurposed (e.g. scanning lab results / food photos).
- **Net-new for Nabani** (build with the recipe above): `Patient`, `Appointment/Consultation`,
  `Measurement/Progress`, `Menu`/`MealPlan`, `Ingredient`, `Package`/`Plan`, `Sale`, `Payment`.

**Recommendation for Nabani**: fork the infra (config, auth, errors, validation, testing, route loader,
base model) verbatim; keep `User`+roles+`ApiKey`; delete the finance resources; then scaffold each
clinic resource with the 9-step recipe in §2. Also rename residual `myexpenses`/`expenses-api`
identifiers, replace committed DB credentials in `db-migrations/config/config.json`, and add a
`seeders/` directory (none exists today).
