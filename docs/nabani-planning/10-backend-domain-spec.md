# Nabani Backend — Phase 1 Domain Spec (build contract)

> The exact schema + conventions for the Nabani domain, implemented on the Maguey base
> (`nabani-backend`). This is the contract for the build. Follow the **existing kept files** as
> the canonical code template: `src/models/user.model.ts`, `src/models/api-key.model.ts`,
> `src/services/user.service.ts`, `src/controllers/user.controller.ts`, `src/routes/user.route.ts`,
> `src/validations/user.validation.ts`, `src/interfaces/user.dto.ts`, `src/interfaces/base.dto.ts`.
> The 9-step add-a-resource recipe is in `nabani/planning/04-maguey-backend.md §2`.

## Conventions (MANDATORY — match Maguey)
- **Sequelize 6 class-factory** models extending `BaseModelInstance`; `underscored: true`; every
  column gets an explicit `field:` when camel≠snake. Factory returns the class; `associate` wires FKs
  (snake_case `foreignKey`).
- **PKs:** UUID via `Sequelize.literal('uuid_generate_v4()')` for all main entities (matches `User`).
  Join tables get their own UUID id + a `unique` composite index on the FK pair.
- **Timestamps:** `createdAt`/`updatedAt` mapped to `created_at`/`updated_at` on mutable entities;
  `timestamps: false` on pure join tables (keep a `created_at` only where useful).
- **Money:** `DECIMAL(10,2)`; coerce to Number in the `toDto` mapper (`+value`).
- **Dates:** `DATEONLY` for business dates (birthday, delivery_date, due_date, menu_date); `DATE` for
  timestamps. Business tz = **America/Mexico_City**; use `date-fns`.
- **Ownership = clinic-wide, NOT per-user.** Do **not** add `owner_id`/`user_id` scoping to queries.
  Access is gated by **role** (`requireRole(...)`), not ownership. Keep `created_by_id`/`updated_by_id`
  (nullable FK→user) on mutable clinical/financial records for audit only.
- **Layering:** route → controller (thin: `requireUserId` if needed → `validateDto` → service →
  `res.json`) → service (ALL logic + `db.*`, `withTransaction` for writes, typed errors, private
  `toXDto`) → model. Validation via Joi registry (`registerSchemas` + `validateDto('name', data)`).
- **Routes** are auto-loaded from `src/routes/*.route.ts`; guard with `.all(this.canAccess)` (JWT) and
  add `requireRole(...)` per the RBAC matrix (Master Context §8). Register **models in 2 places**:
  `src/config/sequelize.ts` + `src/interfaces/sequelize.interface.ts` (DbModels). **Agents: do NOT edit
  these two files — emit the two lines each model needs; the orchestrator wires them centrally.**
- **Migrations:** one sequelize-cli JS file per table in `db-migrations/migrations/` with ordered
  timestamps (see order below), snake_case columns, explicit FKs (`references/onDelete`), indexes.
- **Tests:** unit (mock service) for controllers; integration (supertest) per resource. Mirror the
  `auth` test layout. Add factories in `src/test/factories/`.
- **Swagger:** JSDoc `@swagger` blocks in `src/docs/paths` + `src/docs/schemas` (optional per resource).

## Roles constant
Add `src/interfaces/roles.ts`: `export const ROLES = ['admin','nutriologa','cocina','front_desk','reparto','paciente'] as const;` and `export type Role = typeof ROLES[number];`. User.model default roles → `['cocina']` (least privilege; admin assigns real roles). RBAC matrix per Master Context §8.

## Enums (store as STRING, validate in Joi)
- `food_group`: verdura | fruta | cereal | lacteo | condimento | otros
- `base_unit` / `unit`: gr | ml | pzas
- `meal_slot` (menu day / delivery): desayuno | colacion1 | comida | colacion2 | cena
- `dish.meal_time` (library category): desayuno | snack | comida | cena
- `patient.week`: LD | LV | LS   (LD=Lun–Dom 28d, LV=Lun–Vie 20d, LS=Lun–Sáb 24d)
- `patient.status`: activo | inactivo   (inactivo until first sale)
- `consultation.type`: inicial | seguimiento
- `sale.type` / `delivery.type`: package | consulta
- `sale.billing`: mensual | quincenal | semanal | diario
- `sale.status`: pendiente | pagada ; `payment.method`: efectivo | transferencia | tarjeta
- `expense.type`: fijo | variable | nomina
- `employee.position`: nutriologa | admin | cocina | front_desk | reparto
- `menu_day.status`: borrador | sin_porciones | completo
- `delivery_meal_ingredient.conflict_type`: preference | disease | null

## Tables (25) — grouped by build group

### GROUP A — Catalog & clinical reference  *(orchestrator builds as template)*
1. **disease** — id, `key`(unique), `name`, ts. Seed 16 (diabetes, arterosclerosis, hipertension, infartos, tiroides, embarazo, lactante, colesterolemia, trigliceridos, osteoporosis, digestion, gastritis, colitis, estrenimiento, hidratacion, hormonas).
2. **calorie_level** — id, `kcal`(INT, unique), `label`, `sort_order`(INT), `active`(bool), ts. Seed 1300/1700/2000/2200/2500.
3. **ingredient** — id, `name`, `food_group`(enum), `base_unit`(enum), `base_quantity`(DEC 10,2), `last_price`(DEC 10,2, null), `active`(bool=true), ts.
4. **ingredient_disease** — id, `ingredient_id`FK, `disease_id`FK; unique(ingredient_id,disease_id).

### GROUP B — Dishes & menu templates
5. **dish** — id, `name`, `meal_time`(enum), `usage_count`(INT=0), `active`(bool=true), ts.
6. **dish_ingredient** — id, `dish_id`FK, `ingredient_id`FK, `base_quantity`(DEC), `unit`(enum), `position`(INT).
7. **dish_ingredient_portion** — id, `dish_ingredient_id`FK, `calorie_level_id`FK, `portions`(DEC 6,2); unique(dish_ingredient_id,calorie_level_id).
8. **menu_day** — id, `menu_date`(DATEONLY, unique), `status`(enum=borrador), `created_by_id`FK→user null, ts.
9. **menu_day_meal** — id, `menu_day_id`FK, `meal_slot`(enum), `dish_id`FK null, `position`(INT); unique(menu_day_id,meal_slot).

### GROUP C — Patients & clinical records
10. **patient** — id, `first_name`, `last_name`, `email`, `cellphone`, `gender`, `birthday`(DATEONLY), `week`(enum), `zone`, `tuppers`(bool), `other_food`(TEXT), `other_diseases`(TEXT), `other_preferences`(TEXT), `status`(enum=inactivo), `calorie_level_id`FK null, `nutriologa_id`FK→user null, ts. **No patient number.**
11. **patient_address** — id, `patient_id`FK, `street`, `number_ext`, `number_int`, `neighborhood`, `zip_code`, `city`, `state`.
12. **nutrition_plan** — id, `patient_id`FK(unique), `calorie_level_id`FK, `verduras`,`frutas`,`cereales`,`lacteos`,`p_desayuno`,`p_comida`,`p_cena`,`aceites`,`semillas`(all INT), `comments`(TEXT).
13. **patient_disease** — id, `patient_id`FK, `disease_id`FK; unique.
14. **patient_preference** — id, `patient_id`FK, `ingredient_id`FK; unique.
15. **consultation** — id, `patient_id`FK, `nutriologa_id`FK→user null, `consult_date`(DATEONLY), `price`(DEC), `type`(enum), `weight`,`body_fat`,`muscle`,`water`,`arm`,`waist`,`abdomen`,`hip`,`height`(DEC 8,2 null), `age`(INT null), `objetivo_kcal`(INT null), `notes`(TEXT), `created_at`.

### GROUP D — Packages, sales, payments, delivery/production
16. **package** — id, `display_label`, `code`, `price_per_day`(DEC), `consult_price`(DEC null), `month_discount`,`couple_discount`,`especial_discount`(INT=0), `includes_desayuno`,`includes_snack1`,`includes_comida`,`includes_snack2`,`includes_cena`(bool), `active`(bool=true), ts.
17. **sale** — id, `folio`, `patient_id`FK, `package_id`FK null, `type`(enum), `total_amount`(DEC), `start_date`(DATEONLY), `days`(INT), `billing`(enum), `discount`(DEC=0), `payment_type`, `invoice_requested`(bool), `status`(enum=pendiente), `created_by_id`FK null, ts.
18. **sale_item** — id, `sale_id`FK, `package_id`FK, `quantity`(INT), `unit_price`(DEC), `sub_total`(DEC).
19. **payment** — id, `folio`, `sale_id`FK, `patient_id`FK, `due_date`(DATEONLY), `amount`(DEC), `method`(enum null), `paid`(bool=false), `paid_at`(DATE null), `note`(TEXT), ts.
20. **delivery_day** — id, `patient_id`FK, `sale_id`FK null, `payment_id`FK null, `package_id`FK null, `menu_day_id`FK null, `delivery_date`(DATEONLY), `amount`(DEC), `type`(enum), `has_menu`(bool=false), `authorized`(bool=false), `status`, ts. index(patient_id,delivery_date).
21. **delivery_meal** — id, `delivery_day_id`FK, `meal_slot`(enum), `dish_id`FK null, `included`(bool=true), `created_at`.
22. **delivery_meal_ingredient** — id, `delivery_meal_id`FK, `ingredient_id`FK, `portions`(DEC 6,2), `conflict_type`(enum null), `substituted_from_ingredient_id`FK null, `eliminated`(bool=false), `position`(INT).

### GROUP E — Finance & staff
23. **beneficiary** — id, `name`(unique), `created_at`.
24. **expense** — id, `folio`, `beneficiary_id`FK null, `concept`, `total_amount`(DEC), `expense_date`(DATEONLY), `type`(enum), `employee_id`FK null, `comments`(TEXT), `created_by_id`FK null, ts.
25. **employee** — id, `first_name`, `last_name`, `email`, `position`(enum), `salary_quincenal`(DEC), `last_payment_date`(DATEONLY null), `user_id`FK→user null, `active`(bool=true), ts.

## Migration order (timestamps ascending)
`disease, calorie_level, ingredient, beneficiary` → `ingredient_disease` → `dish, dish_ingredient,
dish_ingredient_portion` → `menu_day, menu_day_meal` → `patient, patient_address, nutrition_plan,
patient_disease, patient_preference, consultation` → `package, sale, sale_item, payment, delivery_day,
delivery_meal, delivery_meal_ingredient` → `employee, expense`. Use `20260704HHMMSS-create-<table>.js`.

## REST endpoints (per resource — standard CRUD unless noted; all under /api, JWT required)
- `GET/POST /ingredients`, `GET/PUT/DELETE /ingredients/:id`; filter by food_group, disease, search.
- `GET /diseases`, `GET /calorie-levels` (+ CRUD, admin).
- `GET/POST /dishes`, `/dishes/:id` (+ nested ingredients & portions); filter meal_time, search; pager.
- `GET/POST /menu-days`, `/menu-days/:id` (+ meals); `GET /menu-days/by-date/:date`; `POST /menu-days/:id/copy-from/:sourceId`.
- `GET/POST /patients`, `/patients/:id` (nested address, plan, diseases, preferences); filters activos/inactivos/por-vencer, search; `PUT /patients/:id/status`.
- `GET/POST /patients/:id/consultations`, `/consultations/:id`.
- `GET/POST /packages`, `/packages/:id`.
- `POST /sales`, `GET /sales/:id`, `DELETE /sales/:id`, `POST /sales/change-amount`; `POST /calculate-package-and-days` (**business logic**, Master Context §5.1).
- `GET /payments` (cobranza; aging), `PUT /payments/:id` (register pago), `DELETE /payments/:id`.
- `GET /delivery-days` (by date/patient), `/calendar-days/:patientId`, `POST /cancel-delivery`,
  `POST /authorize` (bulk), production endpoints: `GET /production-map`, `/delivery-labels`,
  `/kitchen-view`, `/shopping-list` (**aggregations**).
- Menu resolution: `POST /apply-menu-to-patients` (day), `GET /adjustments` (queue), `POST /adjustments/:deliveryDayId/swap`, `POST /adjustments/:deliveryDayId/authorize`.
- `GET/POST /expenses`, `/expenses/:id`, `GET /beneficiaries`; `GET /employees`, `/employees/:id`.
- Dashboard (Hoy): `GET /dashboard/today`, `/dashboard/attention`, `/dashboard/week`.
- Finance reports: `GET /daily-incomes`, `/revenue-by-day`, `/incomes-by-package`, `/expenses-by-type`, `/balance`.

## Business logic to implement (services) — Master Context §5
Package day generation (LD/LV/LS + chunk→installments + Sale→Payments→DeliveryDays txn); discount
precedence; reschedule/cancel; **menu resolution + conflict detection** (kcal-level portions × package
meals → flag preference=amber / disease=blue → auto-apply if 0 preference conflicts); swap suggestions
(same food_group, no disease conflict); authorization gate (adeudo does NOT block); production Σ
aggregation; shopping list (portions×base_quantity→kg grouped by food_group); aging buckets.
