# Tanda: Planificación de outfits (Elite)

Estado: **plan aprobado por Mauri el 11 nov 2026, sin empezar.**

Este documento explica qué se construye, por qué y con qué reglas. Cada fase tiene su propio archivo con los pasos exactos. Está escrito para que un agente pueda ejecutar una fase sin haber leído la conversación donde se decidió.

## Por qué existe esta tanda

- El plan Elite promete "Planificación de outfits" (`constants/planes.ts`) y no existe. Es el problema 10 de `docs/revision-app-2026-11-10.md` y la fase 4 pendiente de `docs/tanda-pagos/README.md`.
- El 11 nov se subió a main una maqueta (`components/views/planificacion/planificacion-view.tsx`, commits de klesnuck `62de799` a `5c04812`). Es solo diseño: datos escritos a mano (un viaje a París), fotos de Unsplash, una "IA" que es un `setTimeout`, nada se guarda, el botón "Comprar" no agrega nada y cualquier plan entra. Además Inicio muestra a **todos** los usuarios una tarjeta con ese viaje falso.
- Esta tanda reemplaza la maqueta por la función real y conserva su diseño visual donde sirva.

## Qué es (decisiones de Mauri, 11 nov 2026)

| # | Tema | Decisión |
|---|---|---|
| D1 | Para quién | Exclusivo de **Elite**. |
| D2 | Gancho para los demás | Esencial y Plus ven una **vista previa bloqueada**: un plan de ejemplo completo con candado y "Desbloquear con Elite". No gasta IA. |
| D3 | Alcance | No solo viajes: **"Mi semana", "Fecha importante" y "Viaje"**. Por dentro es el mismo plan; el tipo solo prellena el formulario. |
| D4 | Cómo se arman | El usuario escribe **qué hará cada día** (oficina, cena, boda, playa). Hasta **2 momentos por día** (día y noche). La IA arma un outfit por momento usando **solo prendas de su armario**. |
| D5 | Maleta | Solo en viajes. Es la lista de **las prendas de los outfits**, agrupadas por categoría, para marcar al empacar. |
| D6 | Clima | Del lugar del plan. Si la fecha cae en los próximos 16 días, **pronóstico real**; si es más lejos, **el clima de esas fechas el año pasado**. Fuente: Open-Meteo (gratis, sin llave). |
| D7 | Calidad | **Revisión automática** en el servidor, **"Otro outfit"** para regenerar un momento y modelo **Claude Sonnet 5.5**. |
| D8 | Día a día | **Outfit de hoy en Inicio** con "Me lo puse", **aviso push la noche anterior** y, en viajes, **aviso para empacar**. |
| D9 | Shop | Si para una actividad no hay prenda adecuada, la IA lo dice y se muestran **prendas del Shop** de esa categoría. |
| D10 | Tamaño | Hasta **30 días** por plan, **2 momentos por día**. Se genera **por bloques de 7 días** (una llamada por bloque). |
| D11 | Cuota | Propia, separada de los outfits del Simulador. Se cuenta en **días planeados**: **14 al día y 30 al mes** (mes calendario, hora de CDMX). Regenerar un momento cuenta 1. Si la IA falla, se devuelve. |
| D12 | Si deja Elite | **Solo lectura**: ve sus planes, marca la maleta y usa "Me lo puse", pero no crea ni regenera, y los avisos se apagan. |
| D13 | Entradas | Tarjeta en **Inicio**, fila en **Perfil**, botón en el **Simulador** y texto en **/planes**. |

## Costos (precios del 11 nov 2026, 1 USD = 18 MXN)

- Sonnet 5.5: $2 de entrada y $10 de salida por millón de tokens (USD).
- Un bloque de 7 días: ~8k tokens de entrada y ~5k de salida, unos **$1.2 MXN**. Por día planeado: **~$0.17 MXN**.
- Con la cuota de D11, el peor caso por usuario Elite es de **~$5 a $10 MXN al mes** (30 días, con reintentos). El uso normal ronda $3 a $4.
- Lo que no usa IA: clima (Open-Meteo), maleta (sale de los outfits), revisión (código), sugerencias del Shop (consulta a la base) y la vista previa (ejemplo fijo).
- Protecciones: cuota diaria y mensual, devolución de cuota si falla, caché del armario en el prompt y una tabla que guarda los tokens reales de cada llamada para comparar con esta estimación.
- **Fuera del código (Mauri):** poner un límite de gasto mensual en la consola de Anthropic. Es el techo duro si algo sale mal.

## Fases

Cada fase es una rama y un PR. Se ejecutan en orden: cada una depende de la anterior, salvo la 0.

| Fase | Rama | Qué hace | Detalle |
|---|---|---|---|
| 0 | `fix/quitar-viaje-falso` | Quita lo falso que ya está en producción: la tarjeta de París en Inicio y la sección "Completa tu maleta" de la maqueta | [fase-0-quitar-lo-falso.md](fase-0-quitar-lo-falso.md) |
| 1 | `feat/planificacion-base` | Migración 23: tablas, funciones, cuota y registro de tokens | [fase-1-base-de-datos.md](fase-1-base-de-datos.md) |
| 2 | `feat/planificacion-ia` | Lógica pura con tests, clima del lugar y la ruta que genera outfits con Sonnet | [fase-2-ia-y-clima.md](fase-2-ia-y-clima.md) |
| 3 | `feat/planificacion-pantalla` | La pantalla real: lista, crear, detalle, maleta, Shop, vista previa y solo lectura | [fase-3-pantalla.md](fase-3-pantalla.md) |
| 4 | `feat/planificacion-entradas` | Inicio (outfit de hoy y tarjeta), Perfil, Simulador y /planes | [fase-4-entradas.md](fase-4-entradas.md) |
| 5 | `feat/planificacion-avisos` | Push la noche anterior y aviso para empacar, con pg_cron | [fase-5-avisos.md](fase-5-avisos.md) |
| 6 | `docs/planificacion-cierre` | Prueba real con cuentas, revisión de costos y documentación final | [fase-6-prueba-y-cierre.md](fase-6-prueba-y-cierre.md) |

## Pendientes de decidir (no bloquean las fases 0 a 3)

- **P1. Barra inferior.** El commit `5c04812` (klesnuck) agregó Planificación como sexto botón. El comentario anterior decía "Máximo 5" y Outfit dejó de estar al centro. Mauri decide si se queda, se quita o reemplaza a otro. Está en la fase 4.
- **P2. Texto "Modelos de IA frontier".** La decisión 4 de `docs/modelo-de-negocio.md` dice que Elite deja de prometerlo. Esta tanda solo cambia la línea de planificación; esa otra la decide Mauri.
- **P3. Precios.** Mauri evalúa subir a Plus $89 y Elite $159. No cambia nada de esta tanda.
- **P4. Topes de la decisión 2** de `docs/modelo-de-negocio.md` (10 análisis y 8 outfits al día). Siguen sin aplicarse y el cálculo del peor caso de Elite depende de ellos.
- **P5. Coordinar con klesnuck.** Está subiendo cambios directo a main en esta misma pantalla. Antes de la fase 0 y de la fase 3, hacer `git fetch` y revisar si hubo cambios nuevos en `components/views/planificacion/`, `constants/navigation.ts` e `inicio-view.tsx`.

## Reglas para quien ejecute una fase

Son reglas de Mauri para este repo. No son opcionales.

1. **Rama y worktree propios.** Otras sesiones cambian de rama en `/home/mauri/Projects/clossapp`. Crear un worktree aparte desde `origin/main` actualizado:
   `git fetch origin && git worktree add -b <rama> <ruta> origin/main`
   Para correr `tsc`, `eslint` o los tests en el worktree, enlazar `node_modules` del checkout principal (`ln -s /home/mauri/Projects/clossapp/node_modules node_modules`) y borrar el enlace antes de commitear.
2. **Sin push ni PR sin el OK de Mauri.** Al terminar, avisar y esperar.
3. **Cero atribución.** Ni `Co-Authored-By` ni "Generated with…" en commits, PRs ni comentarios.
4. **Commits en español, concretos,** con viñetas de qué se hizo y por qué.
5. **Migraciones:** el archivo va en `supabase/NN-nombre.sql`. Antes de aplicarlo en producción, probarlo dentro de una transacción que se deshace (`begin; … rollback;`) con el MCP de Supabase. Aplicarlo en producción **solo con el OK de Mauri**. La migración se aplica **antes** de mergear el código que la usa (en la fase 1 de pagos pasó al revés y hubo 500 en producción).
6. **No correr `npm run build` si hay un `next dev` corriendo:** corrompe `.next`. Verificar con `npx tsc --noEmit`, `node --test lib/*.test.mjs` y `npx eslint <archivos tocados>`.
7. **Prueba visual en celular:** 390×844 en Chromium con el MCP `chromium-devtools` y `next dev`. No pedirle a Mauri que instale Chrome.
8. **No agregar dependencias.** Todo se hace con lo que ya hay.
9. **Textos en español de México, de tú,** cortos. Nada de `alert()` ni `confirm()`: usar los componentes de `components/ui/`.
10. **Documentar.** Al terminar una fase, actualizar su archivo: cambiar "Estado", marcar los criterios cumplidos y anotar en "Hecho" qué se cambió, cómo y qué decidió el agente por su cuenta.
11. **La IA solo se llama desde el servidor.** El `user_id` sale siempre de la sesión, nunca del body.

## Piezas que ya existen y se reutilizan

| Pieza | Dónde | Para qué |
|---|---|---|
| Cuota IA con `usar_ia` | `supabase/15-limites-plan.sql`, `lib/cuota.server.ts` | Patrón a copiar para la cuota de días |
| Topes por plan | tabla `limites_plan` | Se le agregan dos columnas |
| Perfil de estilo para el prompt | `leerEstilo` en `lib/cuota.server.ts`, `bloquePerfilPrompt` en `lib/estilo.ts` | Se agrega al prompt |
| Outfits con IA | `app/api/generate-outfits/route.ts` | Ejemplo de llamada a Claude y de recorte de campos |
| Clima actual | `services/clima.service.ts` (`describir`, `obtenerClima`) | Se mueve `describir` a `lib/` para compartirlo |
| Dibujo de un outfit | `components/views/simulador/outfit-visual.tsx` (`OutfitVisual`) | Mostrar las prendas de cada momento |
| Orden de capas | `LAYER_ORDER` en `constants/categories.ts` | Agrupar la maleta |
| Registrar uso de prendas | `registrarUso` en `services/outfits.service.ts` | "Me lo puse" |
| Prendas del Shop | `fetchVentaItems` en `services/marketplace.service.ts` (RPC `marketplace_publico`) | Sugerir lo que falta |
| Navegar entre vistas | `navegarA` en `lib/navegar.ts` | Ir a /planes, al Shop, a planificación |
| Push | `avisar` en `lib/push.server.ts`, ruta `app/api/push/enviar/route.ts` | Avisos de la fase 5 |
| Cliente admin | `supabaseAdmin()` en `lib/stripe.server.ts` | Escrituras del servidor que el usuario no puede hacer |
| Cron | `supabase/08-cron.sql` (pg_cron + `net.http_post` + secreto `cron_secret` en Vault) | Disparar los avisos |
| Plan del usuario | `useAuthContext()` → `plan`, `demo`, `isGuest`, `userId` | Decidir vista previa, completo o solo lectura |
| Prendas del usuario | `usePrendasContext()` | Convertir `prenda_ids` en prendas |

## Datos de producción a tener en cuenta

- Categorías reales de `prendas.category`: `Top`, `Bottom`, `Outerwear`, `Calzado`, `Accesorio` (las que pide el análisis) y algunas viejas: `Vestido`, `Vestido short`, `Blusa`, `Camisa`.
- `prendas.id` es `bigint`; en el cliente se maneja como `string` (`types/prenda.ts`).
- Las prendas donadas siguen en la tabla con `metadata.donada = true` (`supabase/06-puntos-seguros.sql`). **No deben entrar a un plan.**
- `perfiles` solo deja al usuario actualizar columnas concretas (`supabase/05-perfiles.sql`, `12-perfil-datos.sql`). Los contadores nuevos se cambian solo con funciones `security definer`.
- La última migración es `22-seguridad-prelanzamiento.sql`. Esta tanda usa la **23** y la **24**.
