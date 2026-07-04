# Nabani — Design Implementation Spec (Agave design system)

> Source of truth: `nabani/design_handoff_nabani/`. Built from `shared/agave.css`,
> `shared/nabani.css`, `shared/nabani-shell.js`, `Nabani App v2.dc.html` (desktop),
> `Nabani Movil.dc.html` (mobile), and `README.md`. **Do not modify the handoff files.**
> Fidelity is **hifi**: colors, type, spacing, component anatomy and copy are final;
> sample data is real business data to be replaced with live data. UI language: **Spanish (MX)**.
> Currency `$` MXN, units `gr/ml/pzas/kcal`, dates `d mmm aaaa`.

The design system is **"Agave"** (portable, token-driven, prefix `mg-`), themed for Nabani
(overrides in `nabani.css`, prefix `nb-`, plus a runtime theme applied by the prototype's
`applyTheme()`). This doc is the implementation reference for a **Tailwind theme + CSS variables**
port (React or Angular). The legacy stack is Angular 9 + Node/Express/Sequelize; a token layer
+ component library is the natural target.

---

## 0. CRITICAL: the real brand is applied at runtime, not in the static CSS

`agave.css :root` ships the **Maguey** defaults (`--brand:#2A4C3C` green, `--gold:#E1B66B`).
`nabani.css` only overrides `--gold:#E9A13B` and `--r-card:12px`. **The Nabani brand color
`#5C3A4E` (ciruela / grana cochinilla plum) is set by JS `applyTheme()`**, which writes CSS
custom properties onto `document.documentElement.style` (inline styles win over stylesheet
`:root`). So the effective, correct Nabani palette is:

| var | Effective Nabani value | Meaning |
|---|---|---|
| `--brand` | `#5C3A4E` | ciruela (grana cochinilla) — sidebar, primary btn, modal header |
| `--brand-strong` | `color-mix(in srgb, #5C3A4E 92%, black)` | hover |
| `--brand-tint` | `color-mix(in srgb, #5C3A4E 8%, white)` (~#EFEBEE) | tinted surfaces / neutral tile |
| `--brand-tint-2` | `color-mix(in srgb, #5C3A4E 14%, white)` (~#E4DBE0) | bars, brand-2 fills |
| `--gold` (accent) | `#E9A13B` | cempasúchil — **active nav item + exactly ONE hero number per screen** |

**Implementation:** bake these as your default token values (don't rely on JS). The prototype
also exposes theme options: `accent ∈ {#E9A13B, #C98455, #C4A24E, #B0806A}`,
`brand ∈ {#5C3A4E, #6D4A33, #3E4C6E, #2A4C3C}` — treat brand+accent as a themeable pair
(theme provider / CSS var swap), but ship `#5C3A4E` + `#E9A13B` as the product default.

### Cohesion contract (7 rules — enforce in code review)
1. **One anatomy per concept**: every money list is the same `.mg-row`, every table the same `.mg-table`, every modal the same `.mg-modal`.
2. **Accent (cempasúchil `--gold`) only** on the active nav item and **one** hero number per screen. Nothing else.
3. **Six type sizes only**; `font-variant-numeric: tabular-nums` on ALL amounts (`.num`).
4. **Semantic colors keep semantic meaning**: teal = a real `+`/paid/positive; rose = a real negative/overdue/destructive; amber = warning/preference.
5. **Max one primary button per view.**
6. **Cards** = white, radius 12, 1px `--line` border, no shadow. Only overlays get `--shadow-overlay`.
7. **Dark mode = token swap only** (tokens already in `agave.css body.dark`).

---

## 1. Design Tokens (full reference)

### 1.1 Colors — light (`:root`)
| Token | Value | Role |
|---|---|---|
| `--canvas` | `#F8F9FA` | app background |
| `--card` | `#FFFFFF` | card/surface |
| `--ink` | `#17201B` | primary text (negro verdoso) |
| `--ink-2` | `#4E5A54` | secondary text |
| `--ink-3` | `#7C8680` | meta / placeholders |
| `--line` | `#E7EAE8` | dividers, card border |
| `--line-strong` | `#D8DDDA` | input borders |
| `--brand` | `#2A4C3C` static → **`#5C3A4E` runtime** | brand (see §0) |
| `--brand-strong` | `#1F3A2D` static → runtime mix | hover |
| `--brand-tint` | `#EDF2EF` static → runtime mix | tinted brand surfaces |
| `--brand-tint-2` | `#DCE7E1` static → runtime mix | brand-2 fills / weight bars |
| `--gold` | `#E1B66B` static → **`#E9A13B` (nabani)** | accent (nav active + 1 hero) |
| `--teal` / `--teal-tint` | `#0D9488` / `#E6F4F1` | ingreso, positivo, pagado |
| `--rose` / `--rose-tint` | `#E11D48` / `#FCE8ED` | adeudo, vencido, destructivo |
| `--amber` / `--amber-bright` / `--amber-tint` | `#B45309` / `#F59E0B` / `#FCF0DC` | advertencia, preferencia |

### 1.2 Domain colors (NOT system-semantic — hardcoded inline in the prototype)
| Concept | Style | Used where |
|---|---|---|
| Preferencia alimenticia ("no come") | bg `--amber-tint`, pill `.mg-pill.amber`, row highlight `--amber-tint` w/ `--amber-bright` border | Ajustes, Expediente, Mapa |
| Enfermedad / alergia | **bg `#E3EDF6`, text `#3B5F82`** (blue) — inline, no token | Ajustes rows, disease pills, "No apto para" |
| Sustitución en mapa | text `#3B5F82` `font-weight:600` ("zanahoria cruda 1.5") | Mapa, Vista cocina, Etiquetas |
| Eliminado en mapa | `"0"` in `--rose` `font-weight:700` | Mapa, Vista cocina |
| Cambio completo de platillo | `text-decoration:underline; font-weight:700` + 12px description | Mapa (colspan), Vista cocina |

### 1.3 Ingredient food-group colors (pill `.tint` + dot, via `--pc`)
| Grupo | `--pc` |
|---|---|
| Verdura | `#4E8A6A` |
| Fruta | `#C08A4E` |
| Cereal | `#C9A45C` |
| Lácteo | `#58939C` |
| Condimento | `#7D6A85` |
| Otros | `#5F7386` |

### 1.4 Earthy chart palette (`--e-*`, used for distribution bars)
`--e-forest #33604A · --e-olive #8A8A4E · --e-gold #C9A45C · --e-sienna #A9704F · --e-slate #5F7386 · --e-sage #8FA98C · --e-clay #B0806A · --e-plum #7D6A85`

### 1.5 Radii, shadow, misc
| Token | Value |
|---|---|
| `--r-card` | `16px` (agave) → **`12px` (nabani override)** |
| `--r-btn` | `10px` |
| `--r-field` | `10px` |
| `--r-compact` | `8px` |
| `--r-tile` | `12px` |
| `--shadow-overlay` | `0 12px 40px -8px rgb(23 32 27/.28)` |
| `font-feature-settings` | `"cv11"` (Inter alt) |
| `.num` | `font-variant-numeric: tabular-nums` |

### 1.6 Dark mode (`body.dark` — token swap only)
`--canvas #141715 · --card #1C201E · --ink #ECEFED · --ink-2 #A9B1AD · --ink-3 #788079 ·
--line #2A2F2C · --line-strong #39403C · --brand-tint #243830 · --brand-tint-2 #2C443A ·
--teal-tint #12312C · --rose-tint #3A1A22 · --amber-tint #3A2C14 · --amber #E8A84C`.
Dark also: `.mg-card` gets 1px border no shadow; `.mg-tile.neutral`, `.mg-btn.ghost`,
`.mg-pill.brand`, `.mg-empty .cir` recolor to `#9DBAA9`.
(Note: the domain blue `#3B5F82`/`#E3EDF6` are inline and are NOT dark-adjusted — a port should add dark variants.)

### 1.7 Depth variants (`body.depth-a/-b/-c`) — Nabani uses the "a" look
`nabani.css` hardcodes `.mg-card{ border:1px solid var(--line); box-shadow:none }` (= depth-a, flat bordered). depth-b = shadowed borderless, depth-c = plano on `--canvas #F1F3F2`. Ship depth-a.

### 1.8 Typography — Inter (400–800), SIX sizes only
| Role | Spec |
|---|---|
| Héroe numérico | 30/36 · 700 · tabular · accent or ink (`.mg-hero`, `.mg-hero.gold`) |
| Título de página | 23/30 · 700 · tracking −.01em (`.mg-pagehead h1`) |
| Título card/modal | 15/22 · 600 (`.mg-cardhead h2`, `.mg-modalhead .t` 15.5) |
| Body / título de fila | 14/20 (600 rows/titles, 400 body) |
| Secundario / meta | 12.5/18 · 400 · `--ink-3` |
| Overline (grupos, thead, kicker) | 11 · 600–700 · uppercase · tracking .07em · `--ink-3` (`.mg-kicker`) |

IDs/folios: monospace 11.5px `--ink-3` — class `.rid` (`INV-10633`, `INC-474`, `V-15302`).

### 1.9 Tailwind theme mapping (suggested)
Map each `--token` to `theme.extend.colors` (e.g. `brand`, `brand-strong`, `brand-tint`,
`ink`, `ink-2`, `ink-3`, `line`, `line-strong`, `gold`, `teal`, `rose`, `amber`, `canvas`,
`card`, + `e-*` chart + food-group). Radii → `rounded-card`(12) `rounded-btn`(10) `rounded-field`(10)
`rounded-compact`(8) `rounded-tile`(12). Keep the `mg-*` classes as component recipes (each
CSS block already carries a `tw:` comment) or reimplement as components; the recipes below are
the authoritative anatomy.

---

## 2. Component Catalog (exact CSS from `agave.css` / `nabani.css`)

Icons: **Heroicons outline, stroke 1.7**, injected via `<i data-i="name" data-w="px">`
(`nabani-shell.js` set: home, book, users, dollar, user, id, search, bell, plus, x, chevD,
chevL, chevR, cal, doc, printer, check, alert, clock, dots, arrowR, trash, cog, swap, fire).
Sizes: 21px nav, 20px tile, 17px buttons/fields, 15px row/pager actions, 14px chevrons/inline.

### 2.1 Shell (`.mg-shell` grid 92px + 1fr)
- `.mg-side` sidebar: `background:var(--brand)`, sticky full-height 92px, logo 44px r12, vertical nav.
- `.mg-nav a`: column icon+label, 10.5px 500, radius 10; `:hover` white/.06; `.active` = bg white/.10, **color `--gold`**, 600.
- `.mg-main` + `.mg-topbar`: topbar 60px `--card`, bottom `--line`, sticky z20; holds global search field (280px, `mopen.buscar`), spacer, bell `.mg-iconbtn` with `.dot` (amber-bright), user block (`nb-init sm` initials + name + role label + chevD).
- `.mg-iconbtn`: 38×38 r10, hover `--brand-tint`; `.dot` 8px top-right amber notification.
- `.mg-page`: `padding:32px; max-width:1280px; margin:0 auto`.
- `.mg-pagehead`: h1 23/700 + `.sub` 13 `--ink-3`; `.actions` pushed right (gap 10).

### 2.2 Card family
```css
.mg-card{ background:var(--card); border-radius:var(--r-card); border:1px solid var(--line); box-shadow:none; } /* nabani */
.mg-card-pad{ padding:20px; }
.mg-cardhead{ display:flex; align-items:center; gap:10px; padding:16px 20px 0; }
.mg-cardhead h2{ font-size:15px; font-weight:600; }
.mg-cardhead .sub{ font-size:12px; color:var(--ink-3); }
.mg-cardhead .right{ margin-left:auto; font-size:11px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-3); }
```
Card header supports a right slot: `.right` (uppercase count) or `.mg-pager`/`.mg-btn.ghost.sm`/`.mg-chiprow`.

### 2.3 Tile (`.mg-tile`) — 42px icon square, color via `--tc`
`42×42 r12 grid place-items-center text-white bg:var(--tc,#5F7386)`; `.sm` 34px r10; `.neutral`
= `--brand-tint` bg + `--brand` text (dark → `#9DBAA9`). Used for meal-time icons (fire), label
portion counts ("3"/"D"/"B"), kitchen headers.

### 2.4 Pills (`.mg-pill`) — one family, base h24 / `.sm` h20
```css
.mg-pill{ display:inline-flex; align-items:center; gap:6px; height:24px; padding:0 10px; border-radius:999px; font-size:12px; font-weight:600; line-height:1; white-space:nowrap; }
.mg-pill.sm{ height:20px; padding:0 8px; font-size:11px; gap:5px; }
.mg-pill .dot{ width:6px; height:6px; border-radius:999px; background:var(--pc,currentColor); }
.mg-pill.tint{ background:color-mix(in srgb, var(--pc) 11%, var(--card)); color:color-mix(in srgb, var(--pc) 80%, var(--ink)); }
.mg-pill.solid{ background:var(--pc,#5F7386); color:#fff; }
.mg-pill.neutral{ background:color-mix(in srgb, var(--ink) 7%, var(--card)); color:var(--ink-2); }
.mg-pill.outline{ background:var(--card); border:1px solid var(--line-strong); color:var(--ink-2); height:26px; }
.mg-pill.teal / .rose / .amber / .brand{ background:var(--*-tint); color:var(--*); }
```
Variants in use: `tint`+dot (ingredient groups), `neutral` (billing cadence, Variable, Sin menú),
`teal` (Completo, Nutrióloga, En N días, Semanal), `rose` (Adeudo, Vencido ≥30d), `amber`
(Preferencia, Sin porciones, Vence hoy, Vencido <30d), `brand` (meal codes D/S1/C/S2/Ce, Fijo,
admin). Disease pill = inline `background:#E3EDF6; color:#3B5F82` (no class).

### 2.5 Buttons (`.mg-btn`) — h40 / `.sm` h32, r10
`primary` (brand, white; hover brand-strong), `secondary` (card + `--line-strong` border; hover
brand-tint), `ghost` (brand text; hover brand-tint), `danger` (`--rose-tint` bg + `--rose` text),
`[disabled]` opacity .45. Icon 17px. **Max one `.primary` per view.**

### 2.6 Fields
- `.mg-field` h40 (mobile 44–48), r10, 1px `--line-strong`, `--card`; `:focus-within` = border brand + `box-shadow 0 0 0 3px brand/14%`. Contains optional leading icon 17px + `<input>` + `.chev` (`margin-left:auto`). `.mg-label` = 12.5px 600 `--ink-2`, mb6.
- `.mg-compact` h32 r8 13px — used for portion inputs in Menú del día and small selects; can carry a `.dot`.
- `.mg-chiprow` / `.mg-chip` h28 r-full — **sub-navigation of a section AND filters**. `:hover` brand-tint; `.on` = brand solid white 600.

### 2.7 Transaction row (`.mg-row`) — the single money-list anatomy
```css
.mg-rows > * + *{ border-top:1px solid var(--line); }
.mg-row{ display:grid; grid-template-columns:42px 1fr auto; gap:0 14px; align-items:center; padding:13px 20px; }
.mg-row:hover{ background:color-mix(in srgb, var(--ink) 2.5%, var(--card)); }
.mg-row.noicon{ grid-template-columns:1fr auto; }
.mg-row .tt{ font-size:14px; font-weight:600; }
.mg-row .ss{ font-size:12.5px; color:var(--ink-3); margin-top:2px; display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.mg-row .amt{ text-align:right; font-size:14.5px; font-weight:700; }
.mg-row .amt .meta{ font-size:11.5px; font-weight:500; color:var(--ink-3); margin-top:2px; }
.amt-in{ color:var(--teal); }  .amt-out{ color:var(--ink); }
.rid{ font-family:ui-monospace,Menlo,monospace; font-size:11.5px; font-weight:500; color:var(--ink-3); margin-right:8px; }
```
`.mg-daterow` = uppercase date/group header 11px + right-aligned `.sum` total (used as group
subtotal header in Compras).

### 2.8 Table (`.mg-table`)
thead = 11px uppercase tracking .07em `--ink-3` 600, `border-bottom --line`; td = 12/14 padding
13.5px, `border-bottom --line`, last row no border; `tbody tr:hover td` = 2.5% ink; `.r` right
align, `td.r` 600; ONE kebab (`dots`) per row. Compact `.mg-table td` reused inside cards.

### 2.9 Pager (`.mg-pager`) — always top-right of the card
buttons 30px r8, `.on` brand white; chevL/chevR icons 15px; `.info` `"1–10"` bold + "de N".

### 2.10 Modal (`.mg-modal` + `.mg-scrim`)
scrim `rgb(23 32 27/.45)`, centered, padding 32. Modal: `--card`, r16, `--shadow-overlay`,
column, max-height 100%. Header `.mg-modalhead` = **brand bg**, min-h56, white title `.t` 15.5/600
+ `.s` white/.65 sub + `.x` close (34px r9). Body `.mg-modalbody` scrolls. Footer `.mg-modalfoot`
= top `--line`, 14/20 pad, **key figure left + Cancelar/primary right** (`.actions` margin-left auto).

### 2.11 Empty state + skeleton
`.mg-empty` = center, pad 56/24, `.cir` 64px `--brand-tint` circle + icon 28px, h3 15/600, p 13
`--ink-3`, CTA secondary. `.mg-skel` = shimmer gradient (`mgsk` 1.4s linear).

### 2.12 Bars, hero, toggle, kicker
- `.mg-bars`/`.mg-bar`: label row (`.lbl` justify-between) + 6px track (`color-mix ink 6%`) + `.fill` colored via `--pc`.
- `.mg-hero` 30/700 tabular; `.mg-hero.gold` = accent (the one hero per screen). `.mg-kicker` = 11px overline.
- `.mg-toggle` 36×20 pill switch; `.on` brand + knob slides to 18px.
- Scrollbars: subtle `ink 16%` thumb.

### 2.13 Nabani-only (`nb-*`)
```css
.nb-init{ width:42px; height:42px; border-radius:12px; background:var(--brand-tint); color:var(--brand); display:grid; place-items:center; font-weight:700; font-size:13px; } /* patient initials, NO avatars */
.nb-init.sm{ width:34px; height:34px; border-radius:10px; font-size:11.5px; }
/* Production map: full grid for column reading */
.nb-map th,.nb-map td{ border:1px solid var(--line); }
.nb-map .gsep{ border-left:2px solid var(--line-strong); }        /* meal-time separator */
.nb-map thead tr:first-child th{ border-color:rgba(255,255,255,.28); } /* on brand header */
.nb-map tbody tr:nth-child(even) td{ background:color-mix(in srgb, var(--ink) 2.5%, var(--card)); } /* zebra */
i[data-i]{ display:contents; }
.nb-frame .mg-side{ position:static; height:auto; }  .nb-frame .mg-topbar{ position:static; } /* embedded frames */
@media print{ .mg-side,.mg-topbar,.mg-chiprow,.mg-pagehead .actions,.nb-noprint{ display:none!important } .mg-shell{ grid-template-columns:1fr!important } .mg-page{ padding:0!important; max-width:none!important } body{ background:#fff!important } }
```
`.nb-init` sizes seen: 34 (sm, topbar/tables), 42 (queue/detail), 52 (expediente header), 56 (mobile expediente).

---

## 3. Navigation & State Model (from `class Component`)

```js
state = { screen:'hoy', ptab:'resumen', modal:null }
props = { rol:'admin'|'nutriologa', accent:'#E9A13B', brand:'#5C3A4E' }
```
- **SCREENS (20)**: `hoy | semana dia ajustes platillos | mapa etiquetas cocina compras | pacientes paciente | cobranza ingresos gastos balance paquetes | ingredientes equipo usuarios | login`.
- **MODALS (7)**: `paciente venta pago consulta gasto swap buscar`.
- **PTABS (4, expediente)**: `resumen clinico calendario pagos`.
- **SECTIONS (sidebar → screens)**:
  `hoy:[hoy]`, `plan:[semana,dia,ajustes,platillos]`, `prod:[mapa,etiquetas,cocina,compras]`,
  `pacientes:[pacientes,paciente]`, `finanzas:[cobranza,ingresos,gastos,balance,paquetes]`,
  `cat:[ingredientes,equipo,usuarios]`. Sidebar shows 6 items; **Finanzas + Catálogos render only when `isAdmin`** (`rol==='admin'`).
- Each section uses **chips as sub-navigation** (the sub-screens above). Section active = any of its screens is current.
- `nav[k]`: `setState({screen:k, modal:null}); window.scrollTo(0,0)` → **every navigation closes any open modal and scrolls to top.**
- `mopen[k]`: opens modal (stops propagation); `mclose`: `modal:null`. Scrim click closes; inner `stop` prevents close.
- Role gating beyond sidebar: on **Hoy**, the "Ingresos de hoy" hero card and "Cobranza urgente" card are wrapped in `isAdmin` (hidden for nutrióloga). Cocina/reparto roles → read-only **Vista cocina**.
- `rolLabel`: admin→"Administradora", nutriologa→"Nutrióloga". Topbar user is "Marjorie Córdova".
- Login is a full-screen `sc-if` (z60/z-fixed) outside the shell; "Entrar" → `nav.hoy`; topbar user click → `nav.login` (logout).

> `<sc-if value="{{…}}">` = conditional render, `{{…}}` = binding, `<i data-i>` = icon slot — documentation of state, not markup to ship.

---

## 4. Screen Inventory & Anatomy (desktop)

### 4.1 Hoy (dashboard) — `screen:'hoy'`
Pagehead: `Hoy · sábado 4 de julio` + sub "34 pacientes activos con entrega hoy · Menú: …";
action `Imprimir mapa` (secondary → mapa).
- **Pipeline card** (4 equal columns, clickable buttons, right border between): `1 · Menú del día` (teal check, "Completo · porciones 1300/1700/2000 definidas" → dia) · `2 · Ajustes por paciente` (amber badge "3", "31 listos automáticamente · 3 con conflicto" → ajustes) · `3 · Autorización` (amber badge "4", "30 autorizados · 4 con adeudo" → ajustes) · `4 · Producción` (brand printer, "Mapa y etiquetas listos" → mapa).
- Two-column body `1fr / 380px`:
  - **Requiere atención** card (right slot count "8"): `.mg-rows` of `.mg-row.noicon`, each clickable to its screen — conflict rows (pill amber "Preferencia" / blue "Enfermedad" → ajustes), adeudo rows (pill rose "Adeudo" → cobranza), "Vence hoy" (amber → paciente), "Sin menú · 3" (neutral → ajustes). Multiple patient names can be joined `A · B · C`.
  - **La semana** card: header + ghost "Planear semana →"; 7-column strip, each day = bordered cell with `Lun 29` overline + teal check (done) / "3 ajustes" (amber, today = 2px brand border + brand-tint bg) / "Borrador" (ink-3). First/last cells get rounded outer corners.
  - Right column (admin only for 1st & 3rd): **Ingresos de hoy** hero-gold `$6,854.40` + "23 ingresos individuales"; **Pacientes activos 48 / Entregas hoy 34** dual counter card; **Cobranza urgente** card (3 rose "Vencido hace N días" rows + amounts) + "Ir a Cobranza →".

### 4.2 Planeación → Semana — `screen:'semana'`
Pagehead "Planeación" + sub; actions: `Copiar semana anterior` (secondary), `Menú del día` (primary → dia). Section chips: Semana·Menú del día·Ajustes por paciente·Biblioteca de platillos.
Week pager (`◀ 6 – 12 jul ▶`) + "5 de 7 días completos". **5-column grid of day cards** (clickable → dia): header = "Lunes 6" + "34 entregas" + status pill (`teal Completo` / `amber Sin porciones` / `neutral Borrador`; today = 2px brand border); body = 5 meal-time rows (kicker 10px + dish name) OR `.mg-empty` mini ("Sin menú aún. Crear o copiar de otro día.") for Borrador.

### 4.3 Planeación → Menú del día — `screen:'dia'` ★ COMPLEX
Pagehead "Menú del día · miércoles 8 jul"; actions `Aplicar a pacientes →` (secondary → ajustes) + `Guardar` (primary). Toolbar: date field (200px), `Desde biblioteca`, `Copiar de otro día`, helper text.
**One card per meal-time** (Desayuno, Colación 1, Comida, Colación 2, Cena). Card header = `.mg-tile.sm.neutral` (fire) + `<h2>` meal name + **editable dish-name field (340px h34)** + kebab.
Body = horizontally-scrollable table (`overflow-x:auto; white-space:nowrap`):
`Ingrediente(min180) · Cantidad(r) · Medida · [N kcal-level columns] · [+ Nivel] · [x]`.
- **kcal-level columns are dynamic (N)**: sample shows 1300/1700/2000/2200/2500; each header `<th>` has `background:var(--brand-tint)`; each cell is a `.mg-compact` (width 60, right-aligned input) also on brand-tint; empty levels show placeholder `—`. `+ Nivel` is a ghost button in the header adding a column.
- Ingredient name bold, Cantidad = base gramaje `.num`, Medida = `gr/ml/pzas`. Row delete = rose x.
- Card footer: "Agregar ingrediente…" search field (h36, max 420).
- **Empty meal-time** (Colación 2 sample): `.mg-empty` (52px circle) "Sin platillo para Colación 2 / Elige cómo crearlo — las porciones por nivel se definen aquí mismo" + 3 CTAs: `Desde biblioteca`, `Copiar de otro día`, `Platillo nuevo`.

### 4.4 Planeación → Ajustes por paciente — `screen:'ajustes'` ★ COMPLEX (conflict resolution)
Pagehead "Ajustes por paciente · sábado 4 jul" + "El menú base se aplicó a 34 pacientes · solo revisa los conflictos"; primary `Autorizar 31 listos` (check).
Two-column `360px / 1fr`:
- **Left queue card**: header "Pacientes / 34 con entrega el 4 jul"; filter chips `Todos · 34` / `Conflictos · 3` (on) / `Listos · 31`; `.mg-rows` of `.mg-row` (icon col = `nb-init`): title + "1700 kcal · D,C,C Mensual" + right = conflict pill (`amber "1 conflicto"` for preference, blue for disease) OR teal check (listo). Selected row = `--brand-tint` bg.
- **Right detail card**: header `nb-init` + name + "1700 kcal · Paquete … · NO calabacitas a la mexicana" + `Marcar listo` (secondary). **Legend row**: amber swatch = Preferencia alimenticia; blue `#E3EDF6/#3B5F82` swatch = Enfermedad/alergia; swap icon = Sustituir. Then **per meal-time section**: bold "Desayuno · Tortitas…" heading + `.mg-table` (no thead) rows `ingredient · Ncantidad · N porciones · [swap][x]`. **Conflict rows are highlighted**: `background:var(--amber-tint)` + amber pill "no le gusta" + amber swap icon (preference); `background:#E3EDF6` + white "diabetes" pill + `#3B5F82` swap icon (disease). Swap opens the `swap` modal. Footer note: "Snack 1 y Snack 2 no incluidos en su paquete — la cocina los verá en blanco." (**meals outside the package are omitted**).

### 4.5 Planeación → Biblioteca de platillos — `screen:'platillos'`
Pagehead + primary `Nuevo platillo`. Section chips (plan). Toolbar: search (300px) + filter chips `Todos · 212 / Desayuno / Snack / Comida / Cena` + pager (`1–9 de 212`). **3-column grid of recipe cards**: dish name 14/600 + "4 ingredientes · usado 26 veces" + meal-time pill (`brand`); ingredient list line 12.5 `--ink-2` ("pescado 40 gr · …"); footer = "Porciones: 1300 ✓ · 1700 ✓ · 2000 ✓/✗" + `Usar en menú →` (ghost → dia). The ✓/✗ = per-level portion completeness.

### 4.6 Producción → Mapa de producción — `screen:'mapa'` ★ COMPLEX (dense grid, print output)
Pagehead + date field + `Imprimir` (primary). Section chips (prod). **Legend** (`.nb-noprint`):
blank cell = comida no incluida en su paquete; blue text = ingrediente sustituido; underlined dish = cambio completo.
Card `overflow:auto` wraps `.mg-table.num.nb-map` (`min-width:1760px`, 13px). **Two-row header**:
- Row 1 (brand bg, white): `Paciente | Cal | [colspan meal-time · dish]…` — one group per meal-time (Desayuno colspan4, Snack1 colspan2, Comida colspan4, Snack2 colspan2, Cena colspan7 in sample).
- Row 2: per-ingredient columns = ingredient name + gramaje on 2nd line (`45 gr`), first column of each meal group carries `.gsep` (2px separator).
Body rows = patients (bold name + Cal centered). **Cell conventions (mandatory):**
  - number = portions; **blank = meal not in that patient's package**;
  - `.gsep` on the group's first cell keeps the vertical rule;
  - **substituted ingredient** = `color:#3B5F82; font-weight:600` text e.g. `zanahoria cruda 1.5`;
  - **eliminated** = `0` in `--rose` `font-weight:700`;
  - **full dish change** = `colspan` cell with `<div underline bold>Dish name</div>` + `<div 12px ink-2>` ingredient description (e.g. Tomás Gonzáles / Luz Hernández).
Zebra even rows via `nb-map`. Below (`.nb-noprint`): **Totales para cocina** card — 8-column grid of `kicker + big num` (sum of portions per ingredient). `@media print` strips chrome and prints only the map.

### 4.7 Producción → Etiquetas de entrega — `screen:'etiquetas'` (printable)
Pagehead + date + `Imprimir`. **2-column grid of label cards**: header = nabani icon 34px + centered patient name 16/700 brand + "Nabani" kicker, with **2px brand bottom border**. Body 2 columns: **Comida** block (`.mg-tile` brand with portion number "3" or code "D") + meal name + dish line (substitutions shown in `#3B5F82`, e.g. "(queso sustituido)"); **Bebidas libres** block (`.mg-tile.neutral` "B" + boxed free-beverages text "Agua, té, tisanas, café americano, agua de limón, jamaica y pepino s/a Stevia o Splenda"). Footer italic quote `"30 min de Actividad Física"`.

### 4.8 Producción → Vista cocina — `screen:'cocina'` (read-only tablet)
Pagehead "Vista cocina · sábado 4 jul" + secondary `Ver mapa completo`. **2-column grid, big card per meal-time**: header `.mg-tile.neutral` fire + `<h2 18px>` "Comida · Pescado zarandeado…" + "33 pacientes"; 2-col grid of ingredient totals (`16px name + 13px gramaje` … `24px bold count`); **Excepciones / Cambios completos** section (kicker) listing per-patient substitutions (blue), eliminations (`sin aderezo` rose), and full changes (underlined). Large type for kitchen tablet.

### 4.9 Producción → Compras y costos — `screen:'compras'` ★ COMPLEX
Pagehead + secondary `Imprimir lista`. Two-column `1fr / 400px`:
- **Lista de compras** card: header + `Hoy · sáb 4 / Semana 6–12` chips (toggle); hero-gold `Compra estimada de hoy $1,243.50`; then **grouped by food-group** — each group is a `.mg-daterow` (group name + right `.sum` subtotal) followed by a `.mg-table`: `[checkbox accent-brand] · ingredient · "102 porciones × 40 gr" · N kg/pzas (bold) · $cost`. **Checked = bought = struck-through** (`text-decoration:line-through`, ink-3). Groups: Proteína / Verdura / Cereal / Fruta y lácteo. (**kg = portions × base gramaje.**)
- Right column: **Costo por platillo** card (`.mg-rows`: dish + "Comida · 4 ingredientes" + amount `$28.40` w/ meta "por porción 1300"); **Margen por paquete** card (`.mg-bars`: "D,C,C Mensual · $260/día" + right "55% · $142", fill teal `#3E7C74`; below-target packages fill gold/amber) + **amber alert box** ("C + S Mensual está por debajo del margen objetivo (50%)…").

### 4.10 Pacientes (listado) — `screen:'pacientes'`
Pagehead "Pacientes / 48 activos · 1,044 inactivos" + primary `Nuevo paciente` (→ modal). Card:
header = search (300px) + filter chips `Activos (on) / Inactivos / Por vencer`. `.mg-table`:
`Paciente (nb-init sm + name + email) · kcal (num) · Paquete · Celular (num) · Último día · [kebab]`.
Last-day may render `amber sm "hoy · 04 jul"` pill (vence hoy). Rows click → paciente. **No patient numbers (deprecated).**

### 4.11 Expediente del paciente — `screen:'paciente'`, `ptab ∈ {resumen,clinico,calendario,pagos}` ★ COMPLEX (4 tabs)
Pagehead: back ghost "‹ Pacientes" + `nb-init 52px` + name h1 + sub "1,700 kcal · Paquete D,C,C Mensual · Lunes a Viernes · Tuppers · vence 29 jul"; actions `Nueva venta` (secondary → venta) + `Nueva consulta` (primary → consulta). Tab chips (`ptc`/`pnav`).
- **Resumen** (`1fr/1fr`): left col = **Información general** card (Email, Celular, Dirección+CP, Semana de entrega; "Editar" ghost) + **Preferencias y condiciones** card ("No come" → amber pills; "Enfermedades" → blue pills; note "Se detectan automáticamente al asignar menús"). Right col = **Plan nutricional** card: hero-gold "1,700 kcal" + 2-col list of **9 rations** (Verduras 5, Frutas 5, Cereales 8, Lácteos 2, P.Desayuno 3, P.Comida 5, P.Cena 3, Aceites 2, Semillas 3).
- **Historial clínico** (`1fr/380px`): **Mediciones** card = `.mg-table.num` (Fecha, Peso w/ teal delta, Grasa, Músculo, Cintura, Abdomen, Cadera, Brazo) + **weight bar chart** (4 months, last bar brand, others brand-tint-2, kicker "Peso · últimos 4 meses"). Right = **Consultas** card (`.mg-rows`: "Consulta de seguimiento/inicial" + date · nutrióloga · note + price $600).
- **Calendario**: single card "Julio 2026" + legend (brand-tint = Día de paquete, rose-tint w/ rose border = Adeudo) + pager (◀ ▶ hoy). 7-col month grid: `brand-tint` cells with "✓ menú", `rose-tint` cells "Adeudo", "último día" on last package day, **today = 22px brand filled circle**, out-of-month days ink-3.
- **Pagos y paquetes** (`380px/1fr`): left = **Saldo pendiente** hero-gold `$1,240.00` (+ "2 días con adeudo (9 y 10 jul)" rose) + `Registrar pago` primary (→ pago); **Paquete activo** card (Paquete, Precio/día $260, Facturación Mensual, Vigencia 29 jun–29 jul, Comidas → brand pills D/C/Ce). Right = **Historial de pagos** `.mg-rows` with `.rid` folios (V-15302, C-2201) + "Pagado … · método" + `amt-in +$`.

### 4.12 Finanzas → Cobranza — `screen:'cobranza'` ★ (aging)
Pagehead "Cobranza" + right hero-gold "Por cobrar $23,405.00 / 265 pagos pendientes". Finance chips.
Card header = search + filter chips `Vencidos · 214 (on) / Esta semana · 18 / Todos` + pager top-right.
`.mg-table`: `Paciente (rid + name) · Fecha de pago · **Antigüedad** · Tipo de pago · Total de la venta (r) · [Pagar][trash]`.
**Antigüedad pill logic**: `rose "Vencido · N días"` when ≥30d overdue; `amber "Vencido · N días"` when <30d overdue; `teal "En N días"` when future. Tipo pill = `neutral Mensual` / `teal Semanal`. `Pagar` → pago modal; trash = rose delete.

### 4.13 Finanzas → Ingresos Diarios — `screen:'ingresos'`
Pagehead + right hero-gold "Total del periodo $6,854.40 / 23 ingresos individuales". Card: two date fields (inicio/final) + pager. `.mg-table`: `Id(rid) · Paciente · Paquete · **Ingreso por día** (teal +$) · Total de la venta · [kebab]`.

### 4.14 Finanzas → Gastos — `screen:'gastos'`
Pagehead + right hero-gold "Total del periodo $19,762,723.42 / 13,840 gastos" + primary `Nuevo` (→ gasto). Card: date-inicio + date-fin + Beneficiario select + pager. `.mg-table`: `Id · Concepto (bold + sub detail) · **Tipo** (brand "Fijo" / neutral "Variable") · Fecha · Total pagado (−$negative) · [kebab]`.

### 4.15 Finanzas → Balance General — `screen:'balance'`
Pagehead + two date fields. **3-figure card** (equal columns, right borders): `Ganancia` hero-gold · `Ingresos` hero teal `+$` · `Gastos` hero ink. Then **Ingresos por paquete** card: header right = period total; `.mg-bars` with earthy palette (`--e-*`) per package, widths relative to max.

### 4.16 Finanzas → Paquetes — `screen:'paquetes'`
Pagehead + primary `Nuevo`. Card: search + pager. `.mg-table`: `Id · Nombre (bold + code/consulta sub) · **Comidas incluidas** (brand pills D/S1/C/S2/Ce) · Facturación (neutral pill) · Precio por día · [kebab]`. Meal codes: D=Desayuno, S1=Snack1/Colación1, C=Comida, S2=Snack2/Colación2, Ce=Cena.

### 4.17 Catálogos → Ingredientes — `screen:'ingredientes'`
Pagehead "Ingredientes / 437 registrados" + primary `Nuevo`. Catalog chips (Ingredientes/Equipo/Usuarios). Card: search + **Enfermedad** filter select + pager. `.mg-table`: `Id · Nombre · **Grupo** (tint pill + dot, food-group color) · **No apto para** (blue disease pills; may be multiple or empty) · [kebab]`.

### 4.18 Catálogos → Equipo — `screen:'equipo'`
Pagehead "Equipo / 15 activos" + right hero-gold "Nómina del mes $46,300.00" + primary `Nuevo`. Card: search + pager. `.mg-table`: `Nombre (nb-init sm + name) · **Puesto** (pill: teal Nutrióloga / brand Admin / neutral Cocina·Front desk·Reparto) · Email · Salario quincenal (r) · Último pago · [kebab]`.

### 4.19 Catálogos → Usuarios — `screen:'usuarios'`
Pagehead "Usuarios / 17" + primary `Nuevo`. Card: search + pager. `.mg-table`: `Id · Usuario(email) · Nombre · **Rol** (pill: brand admin / teal nutrióloga / neutral cocina) · [kebab]`.

### 4.20 Login — `screen:'login'`
Full-screen fixed z60 on `--canvas`, centered 400px column: nabani icon 84px r22, "Nabani" 26/800 brand + "Nutrición y cocina saludable · Oaxaca", card with two 44px fields (Correo w/ user icon, Contraseña password) + `Entrar` primary (h44 → hoy) + ghost "¿Olvidaste tu contraseña?"; footer "nabani.app · v2.0".

---

## 5. The 7 Modals

| Modal | Width | Header (t / s) | Fields & behavior | Footer |
|---|---|---|---|---|
| **paciente** (Nuevo paciente) | 760px | "Nuevo paciente" / "Datos, evaluación inicial y plan nutricional" | 6 sections: **Información general** (Nombre*, Apellidos*, Email, Celular, Cumpleaños, Género 2×3) · **Entrega** (Calle y número*, CP, Semana select `2fr/1fr/1fr` + "Entrega en tuppers propios" checkbox) · **Evaluación inicial** (8 fields 4-col: Peso, Estatura, Edad, Grasa, Brazo, Cintura alta, Abdomen, Cadera) · **Enfermedades** (16-checkbox grid: Diabetes mellitus, Arterosclerosis, Hipertensión, Infartos, Tiroides, Embarazo, Lactante, Colesterolemia, Triglicéridos, Osteoporosis, Mala digestión, Gastritis, Colitis, Estreñimiento, Hidratación, Cambios hormonales + "Otras enfermedades" free text) · **Preferencias alimenticias** ("Ingredientes que no come" search-add + "Otras preferencias" free text) · **Plan nutricional** (Calorías* + 9 rations 5-col: Verduras, Frutas, Cereales, Lácteos, P.Desayuno, P.Comida, P.Cena, Aceites, Semillas) | note "Quedará inactivo hasta registrar su primera venta." + Cancelar / **Guardar paciente** |
| **venta** (Nueva venta) | 560px | "Nueva venta" / patient name | Paquete* select (shows "— $260.00/día" + included-meal brand pills) · Fecha inicio* + Días de entrega select · **Facturación** chips (Mensual·Quincenal·Semanal·Diario) · Descuento + Precio por día (readonly, brand-tint) · **breakdown box**: "22 días × $260.00 = $5,720", "Descuento mensual −$520 (teal)", "Total a pagar $5,200" | key figure "Total $5,200.00" + Cancelar / **Registrar venta** |
| **pago** (Registrar pago) | 480px | "Registrar pago" / "patient · venta 21029" | **rose banner** "Pago vencido hace 60 días · programado para el 5 may 2026" · Monto* + Fecha de pago · **Método** chips (Efectivo·Transferencia·Tarjeta) · Nota | key "Por cobrar $4,140.00" + Cancelar / **Confirmar pago** |
| **consulta** (Nueva consulta) | 620px | "Nueva consulta" / "patient · seguimiento" | Fecha + Precio de consulta · **Mediciones** (8 fields 4-col: Peso, Grasa, Músculo, Agua, Brazo, Cintura, Abdomen, Cadera — **last values shown as placeholders**, "última: 04 jun 2026") · **Objetivo de calorías** + note "Si cambia, sus menús se precargan con el nuevo nivel." · Notas | note "Se agregará al historial clínico." + Cancelar / **Guardar consulta** |
| **gasto** (Nuevo gasto) | 480px | "Nuevo gasto" | Beneficiario/concepto* (search or create) · Total a pagar* + Fecha · **Tipo** chips (Variable·Fijo) · Comentarios | Cancelar / **Guardar gasto** |
| **swap** (Sustituir ingrediente) | 520px | "Sustituir ingrediente" / "Cena · queso manchego 30 gr · patient" | conflict banner (amber for preference / would be blue for disease) · search field · **"Equivalentes sugeridos · Lácteo · sin conflicto"** overline → `.mg-rows` of same-food-group ingredients with no disease conflict (name + gramaje + group tint pill + "1 porción" + **Usar** button per row; some flagged e.g. "alto en grasa" amber) | note "La sustitución se marca en azul en el mapa de producción." + **danger "Eliminar de la comida"** (no primary). |
| **buscar** (Búsqueda global) | 560px, top-aligned (pad-top 80) | search field (brand border) | grouped results with uppercase overline + count: **Pacientes** (nb-init + name + context "adeudo $4,140" rose / "sin menú hoy" amber, chevR, → paciente) · **Ventas** (rid + "Pendiente · vencido hace N días" + amount, → cobranza) · **Ingredientes y platillos** (standard `.mg-empty` per group with no results). Footer hint "Enter abre el primer resultado · Esc cierra". |

All modals: brand header + `x` close; scrim click / Cancelar / any `nav` closes. Opened via `mopen.*`
(pacientes→paciente, cobranza/paciente→pago, gastos→gasto, ajustes→swap, topbar→buscar, expediente→venta/consulta).

---

## 6. Mobile Frames (`Nabani Movil.dc.html`) — static canvas, 390px frames

Two sets. Shared shell: app bar 56px (`--card`, or **brand variant** for drill-in flows with back
chevron), campos 48px r12, targets ≥44px, cards reuse `mg-*`.

**Staff app** — bottom tab bar 64px `--brand`, 5 slots with **central FAB 46px accent** (gold, r14, `plus`, offset −22): Hoy · Planeación · [FAB] · Pacientes · Finanzas; active tab = `--gold`.
- **Login**: icon 84px, brand title, 2× 48px fields, Entrar.
- **Hoy**: hero-gold "Ingresos de hoy $6,854.40 / 23 ingresos · 34 entregas · 48 activos"; **Pipeline del día** as a `.mg-rows` list (4 steps w/ status dots + chevR); **Requiere atención** (count 8) list.
- **Ajustes por paciente**: brand app bar + back + "3 conflictos" pill; filter chips; patient card (nb-init) + per-meal cards with highlighted conflict rows (amber/blue) + swap/x icons; **fixed bottom action bar**: `Siguiente conflicto` (secondary) + `Marcar listo` (primary), both h48.
- **Cobranza**: hero-gold "Por cobrar $23,405.00 / 265 pendientes · 214 vencidos"; filter chips; `.mg-rows` rows with rose/amber aging sub + amount + inline `Pagar` ghost.
- **Expediente**: brand app bar + back + kebab; header nb-init 56px; tab chips (Resumen/Clínico/Calendario/Pagos); cards: Saldo pendiente hero + Registrar pago, "No come" amber pills, Enfermedades blue pills, Última medición 2×2 grid.

**Patient portal** — bottom tab bar of **4** (Mi día / Progreso / Pagos / Perfil), no FAB:
- **Mi día**: **brand card "Tu entrega de hoy"** ("En camino · llega ~1:30 pm", "Desayuno · Comida · Cena en tuppers") — **ONE delivery per day, no per-meal state**; "Tu menú de hoy" list (substitutions in blue "con queso panela · ajustada para ti"); free-beverages + PA quote; **"¿No estarás mañana?"** card → danger "Cancelar entrega del lunes 6" with **6:00 pm cut-off rule; cancelled day is added back at end of package**.
- **Mi progreso**: hero-gold "−5.1 kg" since initial consult + weight bar chart; **Última consulta** 2×2 deltas; **Próxima consulta** card + "Cambiar".
- **Pagos**: hero-gold "Saldo pendiente $1,240" + **"Pagar en línea"** (Tarjeta/SPEI/efectivo); package-renewal notice ("vence el 29 jul") + "Renovar"; **Historial** `amt-in` rows.

---

## 7. Domain data model implied by the UI

- **Patient**: nombre, apellidos, email, celular, cumpleaños, género, dirección (calle/CP), semana de entrega (e.g. "Lunes a Viernes"), tuppers propios (bool), **kcal objetivo** (nivel: 1300/1700/2000/2200/2500…), **paquete activo**, estado (activo/inactivo — inactive until first sale), último día de paquete/vigencia. Relations: **preferencias** (ingredientes que no come + free-text like "NO calabacitas a la mexicana"), **enfermedades** (from 16-item catalog + otras), **plan nutricional** (kcal + 9 raciones: verduras, frutas, cereales, lácteos, P.desayuno, P.comida, P.cena, aceites, semillas), mediciones (consultas), ventas, pagos. No patient numbers (deprecated); initials only (no avatars).
- **Consulta (medición)**: fecha, nutrióloga, precio, peso, grasa%, músculo, agua%, brazo, cintura, abdomen, cadera, (estatura/edad on first), objetivo kcal (changing it precarga menús), notas. Tipo: inicial / seguimiento. Deltas computed vs previous.
- **Ingredient**: nombre, **grupo de alimento** (Verdura/Fruta/Cereal/Lácteo/Condimento/Otros — colored), gramaje/medida base (gr/ml/pzas), **enfermedades incompatibles ("No apto para")**, precio (última compra, for costing).
- **Platillo (recipe)**: nombre, **tiempo de comida** (Desayuno/Snack/Comida/Cena), ingredientes (ingredient + cantidad base + medida), **porciones por nivel kcal** (per-level multiplier per ingredient; completeness ✓/✗ per level), uso count.
- **Menú del día**: fecha, per meal-time (Desayuno, Colación1/Snack1, Comida, Colación2/Snack2, Cena) → platillo + ingredient rows with **porciones per kcal level (N dynamic levels)**. Status: Completo / Sin porciones / Borrador.
- **Menú del paciente (aplicado)**: menú del día resolved to the patient's kcal level & package meals; per-row **conflictos** (preference→amber, disease→blue), substitutions (blue), eliminations (rose 0), full-dish changes; estado listo/autorizado.
- **Paquete**: nombre, código (e.g. DCSS), **comidas incluidas** (subset of D/S1/C/S2/Ce), facturación (Mensual/Quincenal/Semanal/Diario), precio por día, consulta price. Meal availability drives which columns appear per patient.
- **Venta**: paciente, paquete, fecha inicio, días de entrega, facturación, precio/día, descuento, total, estado (pendiente/pagado), folio (rid), fecha programada de pago.
- **Pago**: venta, monto, fecha, método (Efectivo/Transferencia/Tarjeta), nota. Aging = today − fecha programada.
- **Gasto**: beneficiario/concepto, total, fecha, tipo (Fijo/Variable), comentarios, folio.
- **Empleado (Equipo)**: nombre, puesto (Nutrióloga/Admin/Cocina/Front desk/Reparto), email, salario quincenal, último pago.
- **Usuario**: email, nombre, **rol** (admin / nutriologa / cocina — gates UI).
- Derived/aggregate: Totales para cocina (Σ porciones/ingrediente), lista de compras (porciones × gramaje → kg), costo por platillo, margen por paquete, cobranza aging, ingresos/gastos/balance por periodo, ingresos por paquete.

---

## 8. Interactions & Flows

### 8.1 Flujo maestro diario (daily master flow)
1. **Crear/copiar Menú del día** with per-kcal-level portions (from library / copy another day / new). Guardar.
2. **Aplicar a pacientes** → auto-applied to every patient with a delivery today, resolved to their kcal level & package meals.
3. **System flags conflicts**: ingredient ∈ patient preferences → **amber**; ingredient not apto for patient diseases → **blue**.
4. **Nutrióloga resolves only conflicts** in Ajustes: **swap** (suggests same-group equivalents with no disease conflict) or **eliminate**. Marcar listo per patient.
5. **Autorizar** ("Autorizar N listos"): nutriólogas authorize their patients; front desk on payment confirmation. **Adeudo does NOT block — only flagged.**
6. **Imprimir Mapa + Etiquetas** → cocina. Vista cocina (tablet, read-only) and Compras y costos derive from the same map.

### 8.2 Other behaviors
- **Every navigation closes any open modal and scrolls to top.**
- **Roles**: admin sees all; **nutriologa hides Finanzas + Catálogos** (sidebar + Hoy income/collection cards); cocina/reparto → read-only Vista cocina.
- **Billing/aging**: package billed mensual/quincenal/semanal/diario; aging computed vs scheduled date; rose ≥30d, amber <30d, teal upcoming.
- **Patient delivery = one per day** (portal has no per-meal delivery state).
- **Cancel delivery** (portal): cut-off **6:00 pm**; cancelled day reposition to end of package.
- **Consultation kcal change** precarga menús at the new level.
- **Hover**: rows/table 2.5% ink; **no entrance/decorative animation**; transitions ≤120ms (hover/toggle only).
- **Print**: `@media print` hides sidebar/topbar/chips/actions/`.nb-noprint`; single-column, no padding, white bg — Mapa and Etiquetas are the print outputs.

---

## 9. Build-priority notes (hardest first)
1. **Mapa de producción** — dense N-ingredient × M-patient grid; colspan full-dish changes, gsep separators, blank/number/blue/rose/underline cell logic, zebra, 1760px scroll + print. Data-join heavy (menu × patients × packages × adjustments).
2. **Menú del día** — dynamic N kcal-level columns (`+ Nivel`), per-ingredient per-level portion inputs, horizontal scroll, per-meal empty states, library/copy sourcing.
3. **Ajustes por paciente** — master/detail queue + conflict detection engine (preference vs disease), swap modal with same-group/no-conflict suggestions, package-meal omission, per-patient authorize.
4. **Expediente (4 tabs)** — Resumen/Clínico (table + bar chart + deltas)/Calendario (month state grid)/Pagos (aging + package + folios) + drives Nueva venta/consulta/pago modals.
5. **Compras y costos** & **Cobranza (aging)** — both derived aggregations (map→shopping/kg/cost/margin; scheduled-date aging pills) with grouped subtotals and threshold alerts.

---

## 10. Assets & fonts
- `assets/nabani-icon.png` (512px brand mark). Uses: sidebar 44px r12, mobile topbar 32px r9, login 84px r22, labels 34px r10.
- Icons: **Heroicons outline** (prototype injects a subset via `nabani-shell.js`; use the official Heroicons library in production).
- Font: **Inter** (Google Fonts) weights 400–800, `font-feature-settings:"cv11"`, tabular-nums on numerics.
