# Handoff: Maguey — Revamp visual "Maguey 2.0"

## Overview
Revamp visual completo de Maguey (app personal de control de gastos, Angular 18 + Angular Material MDC + Tailwind, texto es_MX) para que toda la app comparta un solo lenguaje visual, con la cohesión de Nu Bank como referencia de calidad. La paleta de marca NO cambia; cambia la disciplina con la que se aplica.

## About the Design Files
Los archivos de este paquete son **referencias de diseño hechas en HTML/CSS estático** — muestran el look & feel y el comportamiento esperado, NO son código de producción para copiar. La tarea es **recrear estos diseños dentro del codebase Angular existente** usando Tailwind + Angular Material (MDC) y los patrones ya establecidos del proyecto. No introducir librerías nuevas.

## Fidelity
**High-fidelity.** Colores, tipografía, espaciados, radios y estados están definidos con valores exactos. Recrear pixel-perfect usando las utilidades Tailwind indicadas (cada componente del CSS de referencia trae su receta Tailwind en comentario).

## Cómo leer el paquete
1. `sistema.html` — el spec completo: tokens, tipografía, profundidad elegida (Opción A), y cada componente con su receta Tailwind + notas de override de Material. **Empezar aquí.**
2. `mapa-consistencia.html` — para cada pantalla, qué componente del sistema reemplaza qué elemento actual.
3. `shared/maguey.css` — la fuente de verdad de tokens y componentes (cada bloque comenta su receta Tailwind). Portar los tokens a la config de Tailwind y a los overrides de Material.
4. Los demás `.html` — mockups por pantalla. `shared/shell.js` solo arma el shell/íconos de los mockups; no es parte del diseño a portar.
5. `Maguey Redesign.html` — canvas que muestra todos los frames juntos (requiere abrir en este proyecto; los archivos individuales funcionan standalone).

## Decisiones cerradas (no re-decidir)
- **Profundidad Opción A "Trazo"**: cards con borde 1px `#E7EAE8`, radio 12px, SIN sombra. Overlays (modales/menús) sí llevan sombra `0 12px 40px -8px rgb(23 32 27/.28)`.
- **Contenedor de página**: se conserva el existente `flex flex-col w-full max-w-screen-xl mx-auto p-4 sm:p-6 md:p-8` en TODAS las pantallas.
- Grises verdosos (hue de marca): ink `#17201B`, ink-2 `#4E5A54`, ink-3 `#7C8680`, line `#E7EAE8`, line-strong `#D8DDDA`.
- Gold `#E1B66B` SOLO: nav activa + 1 monto héroe por vista. Teal `#0D9488` solo con signo `+`; rose `#E11D48` solo resta/deuda/destructivo.
- Colores de cuenta/método: los elige el usuario de una **paleta de 16 muted** (ver sistema.html §1); el dot del color acompaña a la cuenta/método en TODA aparición (filas, selects, filtros, ledger).
- Todo monto lleva `tabular-nums`. IDs como `INV-10633` / `INC-474` en mono, dentro del título de fila.
- Etiquetas viven en Flujo de caja (se quitaron de Gastos).
- Categorías familiares: siempre se eligen de la lista existente; crear es solo del administrador.
- Roles en perfil: pills completas ("Administrador"), nunca letras sueltas.
- Nombre completo ("Joel Barranco") como texto principal; email secundario.
- Heroicons outline stroke 1.7; sin animaciones de entrada; es_MX.

## Screens / Views (archivos)
| Archivo | Pantalla | Notas clave |
|---|---|---|
| `gastos.html` | Gastos (prioridad 1) | Fila de transacción `grid-cols-[42px_1fr_auto]`, grupos por fecha con total, acciones del gasto expandido EN la fila (✎ ⧉ 🗑 + contraer, icon-buttons 30px, trash hover rose), expando de artículos, pager compacto en header de card |
| `modal-gasto.html` | Modal crear/editar gasto (prioridad 2) | Form 320px izq + artículos der; tabla con altura de fila FIJA 54px en lectura y edición (misma grilla de columnas); hover = lápiz fantasma + fondo brand 4%; edición = `bg brand-tint + inset ring 2px brand`, inputs compactos 32px; form "agregar" pasa a 2 filas bajo 1240px |
| `revisar-recibo.html` | Revisar Recibo (prioridad 3) | MISMA tabla de artículos que el modal de gasto; secciones "Por revisar" (amber) / "Verificados" (teal); pendientes con línea de resolución (candidatos + Buscar/Crear); checkbox "Guardar código" + SKU en chip mono |
| `dashboard.html` | Dashboard (prioridad 4) | Cuentas con tiles muted + saldo héroe gold; Tendencia estira a la altura de Cuentas (`align-items:stretch`, chart `flex:1`); ledger usa la fila de Ingresos (sin ícono, saldo como meta bajo el monto) |
| `familia-gastos.html`, `familia-presupuestos.html`, `familia-ajustes.html` | Familia (prioridad 5) | Movimientos como columna protagonista; presupuestos con tiles; ajustes: miembros, invitación pendiente inline, categorías outline-pill (bloqueadas rose+candado), privacidad con toggles, disolver = card neutra + botón danger |
| `ingresos.html` | Ingresos | Lista plana sin agrupar, sin ícono, `INC-xxx` + concepto, monto `+$ teal`, stats arriba |
| `inventario.html` | Inventario | Tabla estándar, toggle verde marca, kebab, bulk-select con barra brand-tint, segmented Artículos/Comercios |
| `estado-cuenta.html` | Estado de cuenta TDC | Conciliación tipo Revisar Recibo: "Por conciliar"/"Conciliados" con confirmar por fila (↓ teal) / regresar (↑ amber) + "Confirmar todo"/"Regresar todo"; sin paginación; componente `ccard` |
| `flujo-caja.html` | Flujo de caja | Range picker + chips arriba-derecha; tag-cards = filtro (clic activa, expande fechas a todo el historial de la etiqueta); Sankey con etiqueta como fuente; drill-down categoría → cards subcategoría → tabla; botón "Comparar" |
| `flujo-caja-comparar.html` | Modo comparar | A vs B con multi-select de categorías (pills removibles), período por lado, stats + diferencia semaforizada, barras pareadas, tablas lado a lado |
| `admin-categorias.html`, `admin-cuentas.html`, `admin-metodos.html` | Admin | Tiles + tier pills (Premium brand / Free neutral); cuentas y métodos en tabs separados; `ccard` tamaño FIJO 210×132 |
| `perfil.html` | Perfil + menú usuario | Ver notas arriba |
| `modal-transferencia.html` | Transferir | Selectores Desde/Hacia = fila de cuenta en campo; "Transferir todo · $x"; preview de saldos resultantes |
| `modal-apartados.html` | Apartados | Saldo/Apartado/Disponible + barra; por fila: ⇄ depositar/retirar (panel inline con segmented + preview), ✎ editar, 🗑 eliminar; crear con objetivo + depósito inicial. Entrada: card de cuenta en Admin ("3 apartados · $5,700") y kebab |
| `modal-catalogo.html` | Registrar/editar artículo + beneficiario | Registrar artículo = SOLO Concepto; editar incluye historial de precios (último precio en card brand-tint + lista fecha·comercio·precio·Δ% — rose sube, teal baja); beneficiario: nombre + método habitual |
| `modal-registro.html` | Registrar ingreso + Escanear recibo | Ingreso: cantidad grande teal, total en footer; Escanear: dropzone + Abrir cámara / Elegir de galería |

## Design Tokens
Ver `shared/maguey.css` (bloque `:root`) — es la lista completa y exacta: colores, radios (card 12 / botón-campo 10 / compacto 8 / pill 999), sombra overlay, paleta terrosa de charts y los 16 muted de usuario. Dark mode: bloque `body.dark` (canvas `#141715`, card `#1C201E`; cards siempre con borde en dark).

## Implementación Angular/Material (resumen; detalle en sistema.html)
- Campos: densidad Material -2/-4 vía `mat.form-field-density`; para el compacto de 32px conviene un CVA propio (`<mg-compact-select>` sobre CDK Overlay) en vez de forzar MDC. ng-select: mapear tokens vía CSS vars de `.ng-select-container`.
- Un solo componente `<mg-pill variant size color>` reemplaza las 5+ variantes actuales.
- Toggle: `mat-slide-toggle` con track brand (el ámbar se reserva a warnings).
- Migración de colores crudos guardados → muted más cercano por hue (mapa 1:1 en sistema.html), sin tocar BD.
- Restos a purgar: `bg-blue-50` (fila en edición), `text-red-500/green-600` sueltos, paginaciones gigantes, selects nativos del verify.

## Assets
Sin imágenes. Íconos: Heroicons outline (ya en el proyecto). La tarjeta de crédito es el componente CSS `ccard` (gradiente del color del método), no una imagen.

## Files
Todo el contenido de esta carpeta. Referencia rápida: `sistema.html` (spec) → `mapa-consistencia.html` (dónde aplica) → `shared/maguey.css` (tokens/recetas) → mockups por pantalla.
Agregados post-handoff: `dark-mode.html` (spec completo de dark: tabla de tokens light→dark, reglas, implementación), `modal-buscar-crear.html` (popovers Buscar/Crear artículo del flujo de revisión), `popover-borradores.html` (popover de borradores del topbar). Cualquier mockup se ve en dark agregando `#dark` a su URL.

## Orden de implementación sugerido
1. Tokens en Tailwind config + overrides Material globales (tipografía, campos, botones, radios).
2. Componentes compartidos: `mg-pill`, fila de transacción, pager compacto, tile, empty/skeleton, modal shell.
3. Gastos → Modal de gasto → Revisar Recibo → Dashboard → Familia (orden de prioridad).
4. Resto por el mapa de consistencia; dark mode al final (solo variables).
