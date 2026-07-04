# Legacy Backend Analysis — Nutrivera ("Mi plan")

> Source: `/home/jbarranco/Proyectos/nutrivera/nutrivera-backend-es6`
> A Node.js / Express / Sequelize (ES6, plain JavaScript) REST API for a nutrition clinic + meal-prep business.
> This document is a rebuild reference for the new TypeScript base. **No files were modified.**

---

## 1. Tech Stack & Architecture

### 1.1 Runtime & core dependencies (`package.json`)

| Concern | Library | Version | Notes |
|---|---|---|---|
| HTTP framework | `express` | `4.16.4` | Classic Express 4. |
| ORM | `sequelize` | `^4.42.0` | **Sequelize 4** (pre-`findByPk`-only era; uses `sequelize.import`, `operatorsAliases`). |
| DB driver | `pg` + `pg-hstore` | `^7.8.0` / `^2.3.2` | PostgreSQL (dialect hard-coded `postgres` in `config/sequelize.js`). |
| CLI / migrations | `sequelize-cli` | `^5.5.0` | Used only under `db-migrations/` (seeders only — see §6). |
| Auth token | `jsonwebtoken` | `8.4.0` | HS256 JWT. |
| Password hash | `bcrypt` | `~3.0.6` | Native module. |
| Authorization | `acl` | `^0.4.11` | In-memory ACL backend (barely used — see §4). |
| Validation | `joi` | `14.3.1` | **Joi 14** — legacy `Joi.validate()` API, array-style `.allow([...])`. |
| Dates | `moment` | `^2.24.0` | **`moment-timezone` NOT installed** but `.tz()` is called (bug, §7). |
| Scheduling | `node-cron` | `^2.0.3` | Present but **all cron code is commented out** (`config/express.js`). |
| Logging | `winston` `^3` + `express-winston` + `morgan` | — | Console transport only (`config/winston.js`). |
| Security/infra | `helmet`, `cors`, `compression`, `cookie-parser`, `body-parser`, `method-override` | — | Standard middleware chain. |
| Utility | `lodash`, `http-status`, `debug`, `glob`, `dotenv` | — | |

Engines: Node `>=10.15.0`. Dockerfile pins **node:8.14.0** (stale/inconsistent). Boilerplate origin: "node-express-sequelize" by Joel Barranco.

### 1.2 Folder structure & layering

```
index.js                     # entrypoint: wires config, express app, sequelize
index.route.js               # auto-loads policies + routes via glob, mounts health-check
config/
  config.js                  # env-var loading + Joi validation -> config object
  express.js                 # express app, middleware chain, mounts /api, error handlers
  sequelize.js               # Sequelize init, model auto-import, associate(), sync()
  winston.js                 # logger
server/
  routes/*.js                # 12 route files, one per resource
  controllers/*.js           # 13 controllers (thin HTTP layer + heavy business logic + raw SQL)
    queries/customer.queries.js   # shared raw-SQL fragments
  models/*.js                # 18 Sequelize model definition files (~19 models)
  policies/*.js              # acl role policies (only auth + user defined)
  middlewares/                # auth (JWT), policy-allow (acl), validation (joi), error, audit-logs
  utils/                     # APIError, general-helpers, query-helper, audit-logs (empty)
  validations/*.js           # joi schemas (only user + daily-income)
db-migrations/               # separate sequelize-cli project (seeders + models/index.js + config.json)
tests/                       # mocha/chai/supertest (auth, user, misc) — boilerplate, not domain
bin/, gulpfile.js, Dockerfile, docker-compose*.yml, .env.*
```

There is **no service layer**: controllers contain all domain logic, mixing Sequelize ORM calls and hand-written raw SQL (`db.sequelize.query`).

### 1.3 Config & environment (`config/config.js`)

Env vars are loaded via `dotenv` and validated with a Joi schema (throws on missing required vars):

| Var | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | no | `development` | allow-list: development/production/test/provision |
| `PORT` | no | `4040` | server port |
| `JWT_SECRET` | **yes** | — | JWT signing secret |
| `SQL_HOST` | **yes** | — | Postgres host |
| `SQL_DB` | **yes** | — | Postgres db name |
| `SQL_USER` | **yes** | — | db user |
| `SQL_PASSWORD` | **yes** | — | db password |
| `SQL_PORT` | no | `3306` (⚠ MySQL default; dev `.env` uses `5432`) | db port |
| `LOGGER_LEVEL` | no | `verbose` | winston level |
| `MONGOOSE_DEBUG` | no | env-dependent | leftover from Mongo boilerplate, unused |

`.env.dev`: Postgres `nutrivera` @ localhost:5432, user `postgres`. `gulpfile.js` copies `.env.dev`→`.env` (dev) or `.env.prod`→`.env` (prod).

### 1.4 Boot sequence

1. `index.js` requires `config/config`, `config/express` (the app), and `config/sequelize` (side-effect: connects + syncs DB). If `!module.parent`, `app.listen(config.port)`.
2. `config/sequelize.js`: creates `Sequelize` (pool max 50, `operatorsAliases: false`, `logging` → winston verbose), auto-imports every file in `server/models/` via `sequelize.import`, calls each model's `associate(db)`, then **`sequelize.sync()`** (auto-creates/updates tables — the de-facto schema source, since there are no migration files).
3. `config/express.js`: builds middleware chain (morgan dev logger, body-parser, cookie-parser, compression, method-override, helmet, cors, express-winston in dev), mounts `app.use('/api', routes)`, then error `converter` → `notFound` → `handler`.
4. `index.route.js`: registers a `GET /health-check`, `glob`-loads `server/policies/*.js` calling `invokeRolesPolicies()`, then `glob`-loads `server/routes/*.js` mounting each at `/`.

All API routes are therefore under **`/api`** (e.g. `/api/auth/login`, `/api/people`). Note `/health-check` is mounted inside the router → actually served at **`/api/health-check`**.

---

## 2. Database Models (CRITICAL)

19 models across 18 files. All use `underscored: true` (snake_case columns). Timestamps are `created_at` / `updated_at`. Sequelize `sync()` builds the schema; no migration files define columns, so **the models below ARE the schema** (confirmed against seeders).

**Global convention**: financial/record tables carry audit + soft-delete columns: `created_by_id`, `updated_by_id`, `deleted_by_id` (FK→`user`), `branch_id` (FK→`branch`), `deleted_at` (DATE), and `record_status` BOOLEAN (soft-delete flag; `true` = active). Decimal money fields have a getter that coerces to `Number`.

### 2.1 `User` → table `user` (`user.model.js`)

| Field | Column | Type | Constraints / default |
|---|---|---|---|
| username | username | STRING | NOT NULL, UNIQUE, custom `isUnique` validator (**broken** — uses removed `User.find`) |
| displayName | display_name | STRING | NOT NULL |
| hashedPassword | hashed_password | STRING | NOT NULL |
| email | email | STRING | NOT NULL |
| roles | roles | JSON | default `['user']` |

No associations declared on User, but it is the target of many `belongsTo ... as CreatedBy/UpdatedBy/DeletedBy/Doctor`.

### 2.2 `Person` → table `person` (`person.server.model.js`)

Central entity — represents **both patients (`role='patient'`) and employees** (role: staff/doctor/admin/account…).

| Field | Column | Type | Notes |
|---|---|---|---|
| number | number | INTEGER | patient sequential number (business-facing ID) |
| firstName | first_name | STRING(50) | NOT NULL |
| lastName | last_name | STRING(50) | |
| cellphone | cellphone | STRING(10) | |
| email | email | STRING(80) | |
| gender | gender | STRING(20) | |
| birthday | birthday | DATEONLY | |
| week | week | STRING(30) | delivery pattern: `LD` (Mon–Sun), `LV` (Mon–Fri), `LS` (Mon–Sat) — drives package day generation |
| programKnow | program_know | TEXT | how they heard about the program |
| tuppers | tuppers | BOOLEAN | default false |
| zone | zone | STRING(20) | delivery zone |
| role | role | STRING(20) | `patient` / `staff` / `doctor` / `admin` / `account` |
| otherFood | other_food | TEXT | |
| recordStatus | record_status | BOOLEAN | default true |
| doctorId | doctor_id | INTEGER | FK→user |
| createdById/updatedById/deletedById | *_by_id | INTEGER | audit FKs→user |
| branchId | branch_id | INTEGER | FK→branch |
| deletedAt | deleted_at | DATE | |

**Associations**: `hasMany Address (person_id, cascade, as Addresses)`, `hasOne Calorie (as Calories)`, `hasOne Condition`, `hasOne Disease (as Diseases)`, `hasMany Tracking (as Trackings)`, `belongsTo User (as Doctor via doctor_id)`, `hasMany Sale`, `hasMany Expense (as Nomina)`, `hasOne Salary (employee_id)`, `belongsTo User ×3 (CreatedBy/UpdatedBy/DeletedBy)`, `belongsTo Branch`, and (via join model) `belongsToMany Ingredient as Preferences`.

### 2.3 `Address` → table `address` (`address.server.model.js`)

| Field | Column | Type |
|---|---|---|
| street | street | STRING(100) |
| numberExt | number_ext | STRING(10) |
| numberInt | number_int | STRING(10) |
| neighborhood | neighborhood | STRING(100) |
| zipCode | zip_code | STRING(5) |
| state | state | STRING(50) |
| city | city | STRING(50) |

No `associate` of its own. Receives `person_id` (from `Person.hasMany`) **and** `branch_id` (from `Branch.hasOne`) as FKs. So one address row can belong to a person or a branch.

### 2.4 `Branch` → table `branch` (`branches.server.model.js`)

| Field | Column | Type |
|---|---|---|
| businessName | business_name | STRING(50) |
| commercialName | commercial_name | STRING(50) |
| phone | phone | INTEGER |
| website | website | STRING(100) |
| email | email | STRING(80) |
| RFC | RFC | STRING(13) (Mexican tax ID) |

**Association**: `hasOne Address (branch_id, cascade, as Branch)`. No route/controller exists for branches → effectively single-tenant, seeded/managed out of band. `branch_id` FK is present on person/product/sale/payment/daily_income/expense but never populated by any endpoint.

### 2.5 `Product` → table `product` (`product.server.model.js`)

Meal-plan **packages** and services (e.g. consultations) sold to patients.

| Field | Column | Type | Notes |
|---|---|---|---|
| displayLabel | display_label | STRING(50) | package name |
| code | code | STRING(10) | |
| description | description | TEXT | |
| stock | stock | INTEGER | |
| priceBuy | price_buy | DECIMAL(10,2) | Number getter |
| priceSell | price_sell | DECIMAL(10,2) | Number getter |
| coupleDiscount | couple_discount | INTEGER | % discount |
| monthDiscount | month_discount | INTEGER | % monthly-plan discount |
| especialDiscount | especial_discount | INTEGER | % special discount |
| category | category | STRING(20) | |
| medicConsult | medic_consult | DECIMAL(10,2) | Number getter |
| breakfast/snack1/lunch/snack2/dinner | (same) | BOOLEAN default false | which meals the package includes |
| recordStatus | record_status | BOOLEAN default true | |
| audit: createdById/updatedById/deletedById, branchId, deletedAt | | | |

**Associations**: `belongsTo Branch`, audit `belongsTo User ×3`, and (via SaleItem) `belongsToMany Sale as Sales`.

### 2.6 `Ingredient` → table `ingredient` (`ingredient.server.model.js`)

| Field | Column | Type | Notes |
|---|---|---|---|
| name | name | STRING(50) | |
| groupName | group_name | STRING(50) | food group |
| hipertension/diabetes/colesterol/trigliceridos/colitis/gastritis/embarazo | (same) | BOOLEAN default false | disease-suitability flags (used to auto-flag ingredients to avoid per patient disease) |

Associations declared in the join-model file (§2.11): `belongsToMany Person as People`.

### 2.7 `MainMenu` → table `main_menu` (`main-menu.server.model.js`)

The daily master menu template.

| Field | Column | Type | Notes |
|---|---|---|---|
| name | name | STRING(50) | auto-generated "D Month YYYY" |
| menuDay | menu_day | DATEONLY | the calendar day |
| meals | meals | JSON | array of meals; each meal `{ type, number, name, ingredients:[{id,name,size,unit,position,portions}] }` |
| caloriesValues | calories_values | JSON | |
| caloriesPortions | calories_portions | JSON | per-kcal-tier portion config: `[{ kcal, status, meals:[...] }]` |

No associations (linked to patients only through the denormalized `DailyIncome.menu` JSON copy).

### 2.8 `Calorie` → table `person_calorie` (`person-calories.server.model.js`)

Patient's calorie/portion prescription (1:1 with Person).

| Field | Column | Type |
|---|---|---|
| name | name | STRING(255) — the kcal tier label (e.g. "1200"), matched to `MainMenu.caloriesPortions[].kcal` |
| vegetable, fruit, cereal, milk, breakfast, lunch, dinner, oil, seed | (same) | INTEGER (portions per food group) |
| comments | comments | STRING(255) |

Person `hasOne Calorie` (FK `person_id`). `INNER JOIN person_calorie` gates the patient list query — a patient with no calorie row is invisible in listings.

### 2.9 `Condition` → table `person_condition` (`person-condition.server.model.js`)

Patient clinical/goal profile (1:1).

| Field | Column | Type |
|---|---|---|
| kgLose | kg_lose | DECIMAL(8,2) |
| minWeight/maxWeight | min_weight/max_weight | DECIMAL(8,2) |
| fatDesired | fat_desired | INTEGER |
| fatKgDesired | fat_kg_desired | DECIMAL(8,2) |
| difference | difference | INTEGER |
| diets, medicines | (same) | STRING |
| exercise | exercise | BOOLEAN default true |
| startExer/endExer | start_exer/end_exer | TIME |
| regularFood, breakfast, lunch, dinner, snacks, drinks, alergic | (same) | TEXT |
| portions, dinnerOut, social | portions/dinner_out/social | INTEGER |

### 2.10 `Disease` → table `person_disease` (`person-disease.server.model.js`)

Patient disease flags (1:1). All BOOLEAN default false except `especiales` STRING(255) and `otros` STRING(255):
`diabetes, arterosclerosis, hipertension, infartos, tiroides, embarazo, lactante, colesterolemia, trigliceridos, osteoporosis, digestion, gastritis, colitis, estrenimiento, fibras, hormonas, hidratacion`. These flags are matched against `Ingredient` disease flags to mark menu ingredients "avoidSickness".

### 2.11 `Tracking` → table `person_tracking` (`person-tracking.server.model.js`)

Anthropometric measurement history (Person `hasMany`).

| Field | Column | Type |
|---|---|---|
| weight, height | (same) | DECIMAL(8,2) |
| age | age | STRING(50) |
| ETA | ETA | DECIMAL(8,2) |
| paBed | paBed | INTEGER |
| paSedentary/paModerate/paIntense | pa_sedentary/pa_moderate/pa_intense | INTEGER |
| aEvaluation | a_evaluation | TEXT |
| bodyFat, weightFat, water, weightMuscle, back, arm, highWaist, abs, waist, leg | body_fat/weight_fat/water/weight_muscle/back/arm/high_waist/abs/waist/leg | DECIMAL(8,2) |
| metabolicAge | metabolic_age | INTEGER |

### 2.12 `IngredientPreference` → table `ingredient_preference` (join)

Many-to-many between Person and Ingredient (patient's disliked/avoided ingredients).

| Field | Column | Type |
|---|---|---|
| personId | person_id | INTEGER |
| ingredientId | ingredient_id | INTEGER |

Defines: `Person.belongsToMany(Ingredient, as 'Preferences', through IngredientPreference, fk person_id)` and `Ingredient.belongsToMany(Person, as 'People', fk ingredient_id)`.

### 2.13 `Salary` → table `person_employee_salary` (`person-employee-salary.server.model.js`)

Employee salary (Person `hasOne` via `employee_id`).

| Field | Column | Type |
|---|---|---|
| role | role | STRING(50) |
| amount | amount | DECIMAL(10,2), Number getter |

### 2.14 `Sale` → table `sale` (`sale.server.model.js`)

A sale/order (package, consultation, or product sale).

| Field | Column | Type | Notes |
|---|---|---|---|
| totalAmount | total_amount | DECIMAL(10,4), Number getter | |
| paymentType | payment_type | STRING(20) | e.g. `D` (single day), `M` (month), `Package` variants |
| type | type | STRING(20) | `Package` / `Consulta` / product |
| taxesPercent | tax_percent | DECIMAL(10,4) | |
| taxesAmount | taxes_amount | DECIMAL(10,4) | |
| paymentMean | payment_mean | STRING(50) | cash/card/etc |
| invoiceRequested | invoice_requested | BOOLEAN | |
| recordStatus | record_status | BOOLEAN default true | |
| personId | person_id | INTEGER FK→person | |
| audit + branch fields | | | |

**Associations**: `belongsTo Branch`, `belongsTo Person`, `hasMany DailyIncome (as Dailies, sale_id)`, `hasMany Payment (as Payments, sale_id)`, audit `belongsTo User ×3`. Also `belongsToMany Product as Products` via SaleItem.

### 2.15 `SaleItem` → table `sale_item` (join)

Line items linking Sale↔Product.

| Field | Column | Type |
|---|---|---|
| quantity | quantity | INTEGER |
| unitPrice | unit_price | DECIMAL(10,4) |
| subTotal | sub_total | DECIMAL(10,4) |
| (fk) sale_id, product_id | | INTEGER |

Defines `Sale.belongsToMany(Product, as 'Products', through SaleItem)` and reverse.

### 2.16 `Payment` → table `payment` (`payment.server.model.js`)

An installment/payment schedule entry against a Sale (drives collections/aging "cobranza").

| Field | Column | Type | Notes |
|---|---|---|---|
| endDate | end_date | DATEONLY | due date (earliest delivery day of the installment's dailies) |
| amount | amount | DECIMAL(10,2) | |
| type | type | STRING(20) | |
| paymentStatus | payment_status | BOOLEAN default false | paid? |
| recordStatus | record_status | BOOLEAN default true | |
| personId, saleId | person_id, sale_id | INTEGER FK | sale FK cascades |
| audit + branch fields | | | |

**Associations**: `belongsTo Branch/Person`, `belongsTo Sale (cascade)`, `hasMany DailyIncome (as Dailies, payment_id, cascade)`, audit `belongsTo User ×3`.

### 2.17 `DailyIncome` → table `daily_income` (`daily-income.server.model.js`)

The core **per-day delivery / income** record. Each row = one meal-prep delivery day (or a consultation income entry). Holds the denormalized per-patient menu JSON.

| Field | Column | Type | Notes |
|---|---|---|---|
| incomeDay | income_day | DATEONLY | the delivery/income date |
| amount | amount | DECIMAL(10,2) | per-day revenue slice |
| type | type | STRING(20) | `Package` / `Consulta` |
| hasMenu | has_menu | BOOLEAN default false | menu generated? |
| authorized | authorized | BOOLEAN default false | approved for production? |
| menu | menu | JSON | **per-patient generated menu** (copy of meals+portions+avoid flags) |
| recordStatus | record_status | BOOLEAN default false | active/delivered flag |
| personId, saleId, paymentId, productId | *_id | INTEGER FK | sale FK cascades |
| audit + branch fields | | | |

**Associations**: `belongsTo Branch/Person`, `belongsTo Sale (cascade)`, `belongsTo Payment`, `belongsTo Product`, audit `belongsTo User ×3`.

### 2.18 `Expense` → table `expense` (`expense.server.model.js`)

Company expenses & payroll.

| Field | Column | Type | Notes |
|---|---|---|---|
| totalAmount | total_amount | DECIMAL(10,4), Number getter | |
| expenseDate | expense_date | DATEONLY | |
| concept | concept | STRING(50) | company/vendor name (auto-creates ExpenseCompany) |
| details | details | TEXT | |
| type | type | STRING(50) | `Fijo` / `Variable` / `Nomina` (payroll) |
| taxesPercent/taxesAmount | taxes_percent/taxes_amount | DECIMAL(10,4) | |
| invoiceRequested | invoice_requested | BOOLEAN | |
| recordStatus | record_status | BOOLEAN default true | |
| personId | person_id | INTEGER FK→person | for `Nomina`, the employee |
| audit + branch fields | | | |

**Associations**: `belongsTo Branch/Person`, audit `belongsTo User ×3`.

### 2.19 `ExpenseCompany` → table `expense_company` (`expense-company.server.model.js`)

| Field | Column | Type |
|---|---|---|
| name | name | STRING(50) |

Standalone lookup (auto-populated on expense create/update when `type != 'Nomina'`). No associations.

### 2.20 ER-Style Summary

Tables (19): `user`, `person`, `address`, `branch`, `product`, `ingredient`, `main_menu`, `person_calorie`, `person_condition`, `person_disease`, `person_tracking`, `ingredient_preference`, `person_employee_salary`, `sale`, `sale_item`, `payment`, `daily_income`, `expense`, `expense_company`.

Key relationships:

```
user 1─* person (doctor_id) ; user 1─* [created/updated/deleted_by] on person/product/sale/payment/daily_income/expense

branch 1─1 address
branch 1─* person / product / sale / payment / daily_income / expense   (branch_id; unused in practice)

person 1─* address
person 1─1 person_calorie
person 1─1 person_condition
person 1─1 person_disease
person 1─* person_tracking
person 1─1 person_employee_salary (employee_id)
person *─* ingredient   (via ingredient_preference)  [Preferences]
person 1─* sale
person 1─* payment
person 1─* daily_income
person 1─* expense (Nomina -> employee)

product *─* sale   (via sale_item)
product 1─* daily_income (product_id)

sale 1─* payment       (cascade)
sale 1─* daily_income  (cascade)
payment 1─* daily_income (cascade)

main_menu   (standalone; per-patient menu copied into daily_income.menu JSON)
expense_company (standalone lookup)
```

Cardinality of the money flow: **Sale → many Payments (installments) → many DailyIncomes (delivery days)**. A DailyIncome links back to Sale, Payment, Product and Person, and carries the generated `menu` JSON.

---

## 3. API Endpoints (CRITICAL — frontend↔backend contract)

All paths are prefixed with **`/api`**. Unless noted, handlers live in `server/controllers/<resource>.controller.js`. **Auth column**: `JWT` = `canAccess` middleware (valid token required); `ACL` = additionally passes acl `isAllowed`; `none` = public. Route-param loaders (`router.param`) preload records.

### 3.1 Auth (`auth.route.js` → `auth.controller.js`)

| Method | Path | Handler | Auth | Description |
|---|---|---|---|---|
| POST | /api/auth/login | login | none | Verify username + bcrypt password → JWT (`{id,username,roles}`, 8h expiry) + profile. Spanish error messages. |
| POST | /api/auth/signup | signup | none | Hash password, create User in a txn, return JWT. (⚠ token `id` is undefined — created user not reloaded.) |
| POST | /api/auth/reset | reset | none | Reset password by username → new JWT (⚠ **no `expiresIn`** → non-expiring token). |
| GET | /api/auth/random-number | getRandomNumber | JWT + ACL(admin) | Boilerplate protected demo route. |

### 3.2 Users (`users.route.js` → `user.controller.js`)

| Method | Path | Handler | Auth | Description |
|---|---|---|---|---|
| GET | /api/users | list | **none** (canAccess commented out) | Raw-SQL paginated user list (`?limit,offset`). |
| POST | /api/users | create | **none** | Joi-validated (`createUser`: email + mobileNumber), bcrypt-hash password, create. |
| GET | /api/users/:userId | read | JWT + ACL | Return preloaded user. |
| PUT | /api/users/:userId | update | JWT + ACL | Update username/mobileNumber. |
| DELETE | /api/users/:userId | remove | JWT + ACL | Hard `destroy`. |
| PUT | /api/reset-password | reset | JWT | Reset password by username in body. |

`router.param('userId', getById)` → `findByPk`, sets `req.userDB`.

### 3.3 People / Employees (`people.route.js` → `person.controller.js`)

| Method | Path | Handler | Auth | Description |
|---|---|---|---|---|
| GET | /api/people | list | JWT | Raw-SQL patient list; filters `recordStatus, role='patient', searchText` (name/cellphone/number). Joins `person_calorie`. Returns `{rows,count}`. |
| POST | /api/people | create | JWT | Create Person + nested Address/Disease/Tracking/Calorie + bulk IngredientPreference in a txn. |
| GET | /api/people/:thisPersonId | read | JWT | Preloaded person w/ Addresses, Diseases, Trackings, Calories, Preferences. |
| PUT | /api/people/:thisPersonId | update | JWT | Update person + Addresses[0] + Calories + Diseases; rebuild IngredientPreferences. |
| DELETE | /api/people/:thisPersonId | changePersonStatus | JWT | Soft delete/reactivate via `?recordStatus`. |
| GET | /api/people-ingredients | ingredientsForPreference | JWT | List ingredients (`{id,title}`) + side effect: reset orphan `hasMenu`. |
| POST | /api/employees | createEmployee | JWT | Create employee Person + Salary + Address; optionally create a login User. |
| GET | /api/employees | listEmployees | JWT | Raw-SQL list where `role != 'patient'`. |
| PUT | /api/employee/:thisEmployeeId | updateEmployee | JWT | Update employee + Address + Salary. |
| GET | /api/employee/:thisEmployeeId | readEmployee | JWT | Preloaded employee w/ Address, Salary. |
| GET | /api/consult-data | getDataForConsult | JWT | Person + their `Consulta` sales with daily income days. |

(`getPaysheetHistory` exists in the controller but is **not wired to a route**.)

### 3.4 Menus — master (`menus.route.js` → `menus.controller.js`)

| Method | Path | Handler | Auth | Description |
|---|---|---|---|---|
| POST | /api/menus | create | JWT | Create MainMenu; auto-name; sort meals/ingredients. |
| GET | /api/menus | list | JWT | Raw-SQL search by meal name or `menuDay` (uses `json_array_elements`). |
| GET | /api/menus/:thisMenuId | read | JWT | Preloaded menu (sorted, sizes coerced). |
| PUT | /api/menus/:thisMenuId | update | JWT | Update; rejects duplicate `menuDay`; **nulls `caloriesPortions`**. |
| DELETE | /api/menus/:thisMenuId | delete | JWT | Destroy. |
| POST | /api/menus-for-authorize | authDayMenu | JWT | Bulk set `authorized` on DailyIncome ids. |
| GET | /api/menus-for-authorize | listPatiensPackageforAuth | JWT | List `Package` dailies for a day w/ Person + Product. |
| POST | /api/menus-calories-config | saveCaloriesConfig | JWT | Save per-kcal portions config onto MainMenu. |
| GET | /api/menus-calories-config | getCaloriesConfig | JWT | Build/return per-kcal portion tiers (distinct patient calorie tiers). |

### 3.5 Person Menus — generation/production (`person-menus.route.js` → `person-menus.controller.js`)

| Method | Path | Handler | Auth | Description |
|---|---|---|---|---|
| POST | /api/person-menus | save | JWT | Save a patient's menu into their DailyIncome (`menu`+`hasMenu`). |
| DELETE | /api/person-menus | delete | JWT | Destroy a preloaded personMenu. |
| GET | /api/next-person-for-menu | getNextPatientForMenu | JWT | Build the next unfinished patient's menu for a day (applies calorie tier, avoid-preference & avoid-disease flags). ⚠ uses `moment().tz` (missing dep). |
| GET | /api/create-default-menus | createMenuForCustomers | JWT | Auto-generate & persist menus for all day patients with 0 preference conflicts. |
| GET | /api/menu-per-calories | getMenuPerCalories | JWT | Return `caloriesPortions[kcal]` for a menu. |
| GET | /api/production-menus-labels | getMenusLabels | JWT | Delivery labels (dailies w/ menu + Person zone) for a day. |
| GET | /api/production-menus-map | getMenusMapProd | JWT | **Production aggregation map**: sums ingredient portions across all patients for a day, computes column widths, missing-patient stats. |
| POST | /api/delete-menu-map | deleteMenu | JWT | Clear a daily's menu (`menu=null,hasMenu=false`). |
| GET | /api/edit-person-for-menu | getMenuForEdit | JWT | Load a daily's menu + patient profile for editing. |
| POST | /api/update-person-menu | updatePersonMenu | JWT | Persist edited `menu` onto a daily. |

### 3.6 Products (`products.route.js` → `products.controller.js`)

| Method | Path | Handler | Auth | Description |
|---|---|---|---|---|
| POST | /api/products | create | JWT | Create product (`recordStatus=true`). |
| GET | /api/products | list | JWT | Raw-SQL paginated/search list. |
| GET | /api/products/:thisProductId | read | JWT | Preloaded product. |
| PUT | /api/products/:thisProductId | update | JWT | Update. |
| DELETE | /api/products/:thisProductId | delete | JWT | Soft delete (`recordStatus=false`). |

### 3.7 Ingredients (`ingredients.route.js` → `ingredients.controller.js`)

| Method | Path | Handler | Auth | Description |
|---|---|---|---|---|
| GET | /api/ingredients | list | JWT | Raw-SQL list; search by name/group or by disease flag (`?searchDisease`, ⚠ interpolated → injection). |
| POST | /api/ingredients | create | JWT | Create ingredient. |
| GET | /api/ingredients/:thisIngredientId | read | JWT | Preloaded ingredient. |
| PUT | /api/ingredients/:thisIngredientId | update | JWT | Update. |
| DELETE | /api/ingredients/:thisIngredientId | delete | JWT | Hard destroy. |
| GET | /api/customers-by-ingredients | getCustomersByIngredient | JWT | Patients who avoid a given ingredient. |
| GET | /api/ingredients-for-menu | listForMenu | JWT | Ingredients formatted for menu builder (`size/unit/position` nulls). |

### 3.8 Sales (`sales.route.js` → `sales.controller.js`)

| Method | Path | Handler | Auth | Description |
|---|---|---|---|---|
| GET | /api/sales | list | JWT | Sales by `recordStatus` w/ Person. |
| POST | /api/sales | create | JWT | Create Sale + nested Dailies + SaleItems; overlap check for same-day package. |
| GET | /api/sales/:thisSaleId | read | JWT | Sale w/ product label subquery, Payments→Dailies (ordered). |
| PUT | /api/sales/:thisSaleId | update | JWT | Update sale + sale items + dailies product. (⚠ `Promise.All` typo → throws.) |
| DELETE | /api/sales/:thisSaleId | delete | JWT | Destroy (cascades payments/dailies). |
| POST | /api/change-amount-sale | changeAmountSale | JWT | Update sale total + payment amount + daily amount together. |

### 3.9 Payments (`payments.route.js` → `payment.controller.js`)

| Method | Path | Handler | Auth | Description |
|---|---|---|---|---|
| GET | /api/payments | list | JWT | Raw-SQL collections list (`payment_status`, due date, customer). |
| GET | /api/payments/:thisPaymentId | read | JWT | Preloaded payment. |
| PUT | /api/payments/:thisPaymentId | update | JWT | Update payment + propagate to its DailyIncomes. |
| DELETE | /api/payments/:thisPaymentId | delete | JWT | Destroy + decrement Sale total. |

(`create` exists in the controller but is **not wired**; payments are created via package calculation.)

### 3.10 Daily Incomes (`daily-income.route.js` → `daily-income.controller.js`)

| Method | Path | Handler | Auth | Description |
|---|---|---|---|---|
| GET | /api/daily-incomes | list | JWT | Raw-SQL list between dates w/ sums. |
| GET | /api/daily-incomes/:thisDailyIncomeId | read | JWT | Preloaded daily w/ Sale, sibling dailies, Product. |
| PUT | /api/daily-incomes/:thisDailyIncomeId | update | JWT + `audit('update')` | Update (audit middleware sets `updatedById`). |
| DELETE | /api/daily-incomes/:thisDailyIncomeId | delete | JWT | Destroy + decrement Sale total. |
| GET | /api/calendar-days/:personId | getPackagesByCustomer | JWT | Patient's dailies mapped to calendar events (color by status). |
| POST | /api/cancel-daily-income | changeDailyDay | JWT | Shift a day: cascade all later dailies +1 day, recompute last via `nextAvailableDay`, resync payment due dates. |
| POST | /api/calculate-package-and-days | calculatePackageDays | JWT (Joi: `calculatePackageDays`) | **Package builder**: compute delivery days by `weekType`, chunk into installments, create Sale→Payments→Dailies. |

### 3.11 Expenses (`expenses.route.js` → `expenses.controller.js`)

| Method | Path | Handler | Auth | Description |
|---|---|---|---|---|
| POST | /api/expenses | create | JWT | Create expense; auto-create ExpenseCompany when not payroll. |
| GET | /api/expenses | list | JWT | Raw-SQL list between dates w/ sum. |
| GET | /api/expenses/:thisExpenseId | read | JWT | Preloaded expense. |
| PUT | /api/expenses/:thisExpenseId | update | JWT | Update. |
| DELETE | /api/expenses/:thisExpenseId | delete | JWT | Soft delete. |
| GET | /api/expenses-companies | listCompany | JWT | ExpenseCompany options. |
| GET | /api/expenses-payments-employees | listPaymentsEmployees | JWT | Payroll (`type='Nomina'`) list w/ employee names + sum. |

### 3.12 Dashboard (`dashboard.route.js` → `dashboard.controller.js`)

| Method | Path | Handler | Auth | Description |
|---|---|---|---|---|
| GET | /api/next-payments | getNextPayments | JWT | Unpaid payments due within 36h (cobranza). |
| GET | /api/incomes-packages | incomesByPackages | JWT | Sum daily income grouped by product/package. |
| GET | /api/expenses-type | expensesByType | JWT | Sum expenses grouped by type (Fijo/Variable/Nomina). |
| GET | /api/expire-packages | expirePackages | JWT | Patients whose last delivery day falls within ±4 days. |
| GET | /api/revenue-by-day | getRevenueByDay | JWT | Income vs expense series per day for a range. |
| GET | /api/count-people | countPeople | JWT | Active vs inactive patient counts. |

### 3.13 Misc

- `GET /api/health-check` → `OK` (public).
- `person-records.controller.js` exposes `createTracking` but **no route wires it**.

---

## 4. Auth & Authorization

### 4.1 JWT flow (`middlewares/auth.js`, `auth.controller.js`)
- Login/signup/reset issue an HS256 JWT signed with `config.jwtSecret`, payload `{ id, username, roles }`, `expiresIn = 8h` (login/signup) — **reset omits expiry**.
- `canAccess` middleware reads the token from the **`Authorization` header verbatim** (no `Bearer ` stripping — the frontend must send the bare token). On success sets `req.user`; on failure returns 401 with tags `failed-token` / `expired-token`.

### 4.2 ACL (`middlewares/policy-allow.js`, `policies/*.js`)
- `acl` (npm) with an **in-memory backend**. Policies loaded at boot from `server/policies/*.js` via `invokeRolesPolicies()`.
- Only **two** policy files exist:
  - `auth.policies.js`: `admin` → GET `/api/auth/random-number`.
  - `user.policies.js`: `admin` → `*` on `/api/users/` and `/api/users/:userId`; `user` → get/post on collection, get on item; `guest` → get only.
- `isAllowed` checks `acl.areAnyRolesAllowed(req.user.roles || ['guest'], baseUrl+route.path, method)`.

### 4.3 Effective authorization (key finding)
**ACL is essentially unused.** Only the users and auth-demo routes reference `isAllowed`, and even `/api/users` collection has `canAccess` + `isAllowed` **commented out**. Every other resource (people, menus, sales, payments, expenses, products, ingredients, dashboard, daily incomes) is guarded **only by `canAccess` (any valid JWT)**. There is no per-role restriction on clinical or financial data — any authenticated user can do everything. The new system needs a real RBAC design.

### 4.4 Roles observed
- **User.roles** (JWT/login roles, JSON array): `admin`, `user`, plus seeded free-text values `nutriologo`, `doctor`, `staff`. Default `['user']`. `guest` is only a fallback in code.
- **Person.role** (domain role, string): `patient`, `staff`, `doctor`, `admin`, `account`.
- No formal permission matrix beyond the two policy files above.

### 4.5 Audit
- `middlewares/audit-logs.js` sets `createdById/updatedById/deletedById/deletedAt` from `req.user`, but is **only wired on `PUT /api/daily-incomes/:id`**. All other audit columns are effectively unmanaged. (`utils/audit-logs.js` is empty.)

---

## 5. Business Logic (domain)

### 5.1 Packages & delivery-day generation (`daily-income.controller.js`)
- **`calculatePackageDays`**: given `{productId, initialDate, quantity, weekType, chunk, totalAmount, personId}`:
  - `getDaysArrayForPackage(day, type, count)` recursively builds `quantity` delivery dates from `initialDate`, skipping days per `weekType`: `LV` skips Sat(6)+Sun(0), `LS` skips Sun(0), `LD` uses every day.
  - Overlap guard: rejects if any generated day already has a DailyIncome for the patient.
  - `totalByDay = totalAmount / quantity`; days are `_.chunk`ed into installments of size `chunk`; `totalByPayment = totalAmount / payments.length`.
  - Persists a **Sale → many Payments → many DailyIncomes** graph in one txn; each Payment `endDate` = its first daily's day; each DailyIncome starts `recordStatus:false`, `type:'Package'`.
- **`changeDailyDay`** (reschedule/cancel): shifts every daily on/after the target date forward by one, recomputes the final day with `nextAvailableDay` (respecting `week`), and rewrites each Payment's `endDate` to its earliest remaining daily.
- Money adjustments cascade: deleting a Payment or DailyIncome decrements `Sale.totalAmount`; `changeAmountSale` updates sale/payment/daily amounts together.

### 5.2 Menu system (`menus.controller.js`, `person-menus.controller.js`)
- **MainMenu** is the daily template: `meals` JSON (breakfast/snack1/lunch/snack2/dinner, each with ingredients+`portions`), and `caloriesPortions` — the same meals replicated per **calorie tier** (`kcal` matches `person_calorie.name`).
- **Per-patient generation** (`getNextPatientForMenu` / `createMenuForCustomers`):
  1. Load the day's MainMenu; pick the calorie tier matching the patient's `Calories.name` (errors if missing).
  2. Keep only meals the patient's **Product** includes (`product[meal.type]` boolean).
  3. Flag ingredients: `avoidPreference` if in the patient's IngredientPreferences (counts a "conflict" when portions ≥ 1); `avoidSickness` if the ingredient's disease flag matches one of the patient's `Diseases`.
  4. Persist the resolved menu JSON into `DailyIncome.menu` with `hasMenu=true`. `createMenuForCustomers` auto-saves only for patients with **0 preference conflicts** (the rest need manual review).
- **Authorization gate**: a daily must be `authorized=true` before it appears for menu generation (`authDayMenu` bulk-sets it).
- **Production map** (`getMenusMapProd`): the core kitchen output. Normalizes every patient's menu into the 5 meal slots, sums each ingredient's `portions` across all patients for the day (`originalIng.count`), warns on missing portions, computes print column widths (`getColumnsProductionMap`, magic constants 1192/1195), and reports missing/inactive patient numbers (`getCustomersStatistics` via sequence-gap detection on `person.number`).

### 5.3 Finance / collections (cobranza)
- **Payments** model the installment schedule; `paymentStatus=false` = outstanding.
- Dashboard **`getNextPayments`** = due within 36h; **`expirePackages`** = packages ending within ±4 days (renewal prompts); **`getRevenueByDay`** builds income-vs-expense series; **`incomesByPackages`** / **`expensesByType`** = grouped sums.
- **Expenses**: `Fijo`/`Variable`/`Nomina`. Non-payroll auto-creates an `ExpenseCompany` from `concept`. Payroll (`Nomina`) links to an employee Person; `listPaymentsEmployees` / `getPaysheetHistory` report it.

### 5.4 Scheduled jobs
None active. `node-cron` is a dependency and there is a **commented-out** hourly job in `config/express.js` intended to reset `hasMenu=false` where `menu IS NULL`. That reset logic instead runs opportunistically inside `people-ingredients` and `production-menus-map` handlers.

---

## 6. Migrations & Seeds (`db-migrations/`)

- **There are NO migration files.** The production schema is created/altered at boot by **`sequelize.sync()`** (`config/sequelize.js`, `sync: true`). This is the single biggest schema-fidelity risk for a rebuild — the models are the only schema source of truth.
- `db-migrations/` is a **separate sequelize-cli mini-project** (its own `models/index.js` + `config/config.json`) containing only **seeders** (data loaders), no `migrations/` dir:
  - `20190221181914-users.js` (10 users; passwords are placeholder `'ah'`), `20190221190457-person.js` (~380 people, mostly `role=patient`, `week=LV`), `20190226182114-ingredients.js`, `20190226183603-ingredient-preferences.js`, `20190306163616-product.js`, `20190306163621-sale.js`, `20190306163627-payment.js`, `20190306163635-daily-income.js`, `20190325014131-expenses.js`, `20190414174723-sale-items.js`, `20190619032033-calories.js`, `20190622224029-diseases.js`. Plus `data-json/user.json`.
- `db-migrations/config/config.json` is **inconsistent**: `development` = Postgres `nutrivera`; but `test` and `production` = **MySQL** `database_test`/`database_production` (leftover from the boilerplate — the app itself only speaks Postgres).
- Schema evolution readable from seeder timestamps: core entities (users/person/ingredients/products/sales/payments/daily-income) landed Feb–Apr 2019; **calories** and **diseases** structures were added later (Jun 2019), matching the menu/calorie-tier feature maturing last.
- Manual index note in `queries/customer.queries.js`: `CREATE INDEX ix_daily_income ON daily_income(person_id, income_day)` is required for the "last day" subquery to perform — an index NOT created by `sync()`.

---

## 7. Tech Debt & Refactor Risks

### 7.1 Sequelize 4 → 6
- `sequelize.import(...)` (both `config/sequelize.js` and `db-migrations/models/index.js`) — **removed in v6**. Models must switch to explicit `require` + `Model.init` (or `sequelize.define`) factory pattern.
- `operatorsAliases: false` — removed (secure by default in v6).
- `sync: true` on the connection + `sequelize.sync()` on boot — must be replaced by real **migrations** for the TS rebuild (no schema history currently exists).
- `User.model.js` `isUnique` validator calls **`User.find(...)`** (removed in v4+; only `findOne` exists) and misuses `this` in an arrow function — the validator is dead/broken. Rely on the DB `unique` constraint instead.
- `belongsToMany` `through` on join models, cascade behaviors, and `db.sequelize.query` result destructuring (`[rows]`, `[[count]]`) all need re-testing under v6.

### 7.2 Joi 14 → 17/18
- `Joi.validate(value, schema)` (used in `config/config.js` and `middlewares/validation.js`) — **removed**; must become `schema.validate(value)`.
- `Joi.string().allow(['a','b'])` array form (config `NODE_ENV`) — v16+ requires spread args `allow('a','b')` / `valid(...)`.
- `.options({ language: {...} })` custom messages (daily-income validation) — the `language` API was replaced by `messages`/`errors`.
- Validation coverage is minimal: **only** `createUser` and `calculatePackageDays` are validated. Every other write endpoint trusts `req.body` directly (mass-assignment risk — e.g. `person.update(req.body)`, `product.update(req.body)`).

### 7.3 Security & correctness
- **SQL injection**: several list endpoints build SQL by string interpolation of `req.query` — `ingredients.list` (`searchText`, `searchDisease` injected raw into `WHERE`), `menus.list` (`searchText`/`menuDay`), and the `searchNumber` fragment in `person`/`payment` lists (regex-guarded but still concatenated). Must move to parameterized queries or an ORM/query builder.
- **Broken/again-flagged handlers**: `sales.update` uses `Promise.All` (capital L → `TypeError`); `auth.signup` signs a token with `id: undefined`; `auth.reset` issues a **non-expiring** JWT.
- **Missing dependency**: `person-menus.controller.js` calls `moment().tz('America/Mexico_City')` but `moment-timezone` is **not** in `package.json` → `getNextPatientForMenu` throws at runtime unless the package is present transitively. Must add `moment-timezone` (or migrate to `date-fns-tz`/Luxon) and be explicit about the `America/Mexico_City` business timezone.
- **Shared mutable error object**: every controller instantiates one module-level `apiError` and mutates `.status/.message/.error` per request → cross-request race conditions and misleading error messages under concurrency. Rebuild should create errors per-request.
- **No `Bearer` scheme**: token read raw from `Authorization` header; brittle contract with the frontend.
- **Authorization gap** (§4.3): effectively "any logged-in user can do anything." Financial + clinical data are unprotected by role.
- Hard `destroy` on users/ingredients/menus vs. soft-delete (`recordStatus`) elsewhere — inconsistent deletion semantics.

### 7.4 Domain-specific gotchas for the rebuild
- The **denormalized menu JSON** (`daily_income.menu`, `main_menu.meals/caloriesPortions`) carries load-bearing runtime fields (`avoidPreference`, `avoidSickness`, `position`, `portions`, `count`, `translate`). The production map, labels, and editing all depend on this exact shape — preserve it or migrate it deliberately.
- **Calorie-tier matching is string-based**: `person_calorie.name` (STRING) must equal `main_menu.caloriesPortions[].kcal`. Fragile; a typo silently breaks a patient's menu.
- **`week`/`weekType` (LD/LV/LS)** encodes delivery schedules and drives recursive date math and rescheduling. Central to the meal-prep calendar.
- **`branch_id` multi-tenancy is scaffolded but dead** (no branch CRUD, never populated) — decide whether to implement real multi-branch or drop the columns.
- **`person` conflates patients and employees** (plus `person_employee_salary`, optional linked `user`). Consider splitting Patient vs Employee entities in the new model.
- Magic numbers in the production map (`1192`, `1195`) are print-layout widths — document/relocate to the frontend or config.
- The manual `daily_income(person_id, income_day)` index and other performance-critical indexes are undocumented outside a code comment.

### 7.5 Tooling/infra
- Dockerfile pins **node:8** while `engines` says `>=10.15`; ESLint airbnb-base + gulp/nodemon dev flow; tests (`mocha/chai/supertest`) cover only auth/user boilerplate, **no domain coverage** — the rebuild starts with essentially zero behavioral test safety net.
```

---

## Files of record (all under `/home/jbarranco/Proyectos/nutrivera/nutrivera-backend-es6`)

- Boot/config: `index.js`, `index.route.js`, `config/config.js`, `config/express.js`, `config/sequelize.js`, `config/winston.js`.
- Models: `server/models/*.server.model.js`, `server/models/user.model.js`, `server/models/sale-item.model.js`.
- Routes: `server/routes/*.route.js`. Controllers: `server/controllers/*.controller.js`, `server/controllers/queries/customer.queries.js`.
- Auth/validation: `server/middlewares/{auth,policy-allow,validation,error,audit-logs}.js`, `server/policies/{auth,user}.policies.js`, `server/validations/{user,daily-income}.validation.js`.
- Data: `db-migrations/seeders/*.js`, `db-migrations/config/config.json`, `db-migrations/models/index.js`.
