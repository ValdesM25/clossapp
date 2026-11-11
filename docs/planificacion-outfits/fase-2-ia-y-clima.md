# Fase 2: lógica, clima e IA

Estado: **hecha (11 nov 2026) en `feat/planificacion-ia`, sin integrar todavía a `integracion/elite`.** Prueba real con mariela@clossapp.com (Elite) y prueba de cuenta sin Elite hechas.
Rama: `feat/planificacion-ia`. Depende de la fase 1 (migración 24 aplicada en producción).

## Objetivo

Todo lo que no es pantalla: tipos y reglas puras con tests, el clima del lugar del plan y la ruta que arma los outfits con Claude Sonnet 5.5, revisa lo que devuelve, guarda y cobra la cuota.

## Archivos

| Archivo | Nuevo o cambia | Qué lleva |
|---|---|---|
| `lib/clima.ts` | nuevo | `describir` (movida), clima por fechas, búsqueda de lugares |
| `services/clima.service.ts` | cambia | importa `describir` de `lib/clima.ts` en vez de definirla |
| `lib/planificacion.ts` | nuevo | tipos, constantes y funciones puras |
| `lib/planificacion.test.mjs` | nuevo | tests con `node --test` |
| `lib/planificacion.server.ts` | nuevo | prompt, esquema y llamada a Claude (solo servidor) |
| `app/api/planificacion/generar/route.ts` | nuevo | la ruta |
| `constants/planes.ts` | cambia | motivos y mensajes nuevos de la cuota |

## 1. `lib/clima.ts`

Módulo neutral (sin `navigator`, sin React): lo usan el servidor y el cliente.

- Mover aquí `describir(codigo)` desde `services/clima.service.ts` y exportarla. En `services/clima.service.ts`, importarla. No cambia nada más de ese archivo.
- Tipos:
  ```ts
  export type FuenteClima = "pronostico" | "historico"
  export type ClimaDia = { min: number; max: number; texto: string; lluvia: boolean; fuente: FuenteClima }
  export type Lugar = { nombre: string; lat: number; lon: number; zona?: string }
  ```
- `fuenteParaFecha(fecha: string, hoy: string): FuenteClima`: `"pronostico"` si la fecha está a 15 días o menos de hoy, `"historico"` si está más lejos. Las fechas son `YYYY-MM-DD`.
- `restarUnAnio(fecha: string): string`: misma fecha un año antes; el 29 de febrero pasa a 28.
- `climaParaFechas(lugar: Lugar, fechas: string[], hoy: string): Promise<Record<string, ClimaDia>>`:
  - Separa las fechas por fuente y hace **como máximo dos llamadas**, cada una con `signal: AbortSignal.timeout(8000)`.
  - Pronóstico (probado el 11 nov 2026; devuelve 16 días):
    `https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&start_date=<min>&end_date=<max>`
    `lluvia = describir(code).lluvia || probabilidad >= 50`.
  - Histórico, con cada fecha pasada por `restarUnAnio` (probado el 11 nov 2026):
    `https://archive-api.open-meteo.com/v1/archive?latitude=<lat>&longitude=<lon>&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto&start_date=<min>&end_date=<max>`
    `lluvia = describir(code).lluvia || precipitation_sum >= 2`.
  - Las respuestas traen `daily.time[]` y un arreglo por variable en el mismo orden. Redondear `min` y `max` a enteros.
  - La llave del resultado es **la fecha original del plan**, no la del año pasado.
  - **Nunca lanza.** Si una llamada falla, esas fechas quedan sin clima: el clima ayuda, pero no debe impedir armar outfits.
- `buscarLugares(texto: string): Promise<Lugar[]>` (para el formulario del cliente):
  `https://geocoding-api.open-meteo.com/v1/search?name=<texto>&count=5&language=es&format=json`
  Cada resultado trae `name`, `admin1`, `country`, `latitude`, `longitude` y `timezone`. `nombre` se arma como `"<name>, <admin1>, <country>"`, saltando partes vacías o repetidas. Con menos de 2 letras, o si falla, devuelve `[]`.

## 2. `lib/planificacion.ts` (puro, con tests)

Lo importan el cliente, el servidor y `node --test`. Node corre el `.ts` quitando los tipos, así que:
- **solo sintaxis que se pueda borrar:** nada de `enum`, `namespace` ni propiedades en constructores;
- **sin imports con `@/`:** Node no los resuelve. Los tipos de otros módulos van con `import type` (se borra al correr) y las funciones van en este mismo archivo.

Contenido:

```ts
import type { ClimaDia, Lugar } from "./clima"

export type TipoPlan = "semana" | "fecha" | "viaje"
export type Momento = "dia" | "noche"
export type EstadoMomento = "pendiente" | "listo" | "error"
export type OutfitPlan = { titulo: string; descripcion: string; prenda_ids: string[] }
export type Faltante = { categoria: string; motivo: string }
export type MomentoPlan = {
  id: string; plan_id: string; fecha: string; momento: Momento; actividad: string
  clima: ClimaDia | null; outfit: OutfitPlan | null; faltante: Faltante | null
  estado: EstadoMomento; generado_en: string | null; usado_en: string | null
}
export type PlanOutfit = {
  id: string; tipo: TipoPlan; nombre: string; fecha_inicio: string; fecha_fin: string
  lugar: Lugar | null; empacadas: string[]; created_at: string; momentos: MomentoPlan[]
}
export type Grupo = "arriba" | "abajo" | "completo" | "abrigo" | "calzado" | "accesorio" | "otro"

export const MAX_DIAS_PLAN = 30
export const MAX_DIAS_BLOQUE = 7
export const MAX_PRENDAS_OUTFIT = 7
export const MIN_PRENDAS_PLAN = 5
export const TEMP_ABRIGO = 12 // °C mínimos con los que el outfit debe llevar abrigo
```

Funciones (todas puras, fechas como `YYYY-MM-DD` y aritmética en UTC: `new Date(\`${f}T00:00:00Z\`)`):

| Función | Qué hace |
|---|---|
| `grupoDe(categoria)` | Normaliza (minúsculas, sin acentos, sin espacios a los lados). Empieza con `vestido` → `completo`; `top`, `tops`, `blusa`, `camisa`, `playera`, `sueter` → `arriba`; `bottom`, `pantalon`, `falda`, `short`, `jeans` → `abajo`; `outerwear`, `abrigo`, `chamarra`, `chaqueta` → `abrigo`; `calzado`, `zapatos` → `calzado`; `accesorio`, `accesorios` → `accesorio`; lo demás → `otro`. |
| `diasEntre(inicio, fin)` | Todas las fechas del rango, incluidas las dos puntas. |
| `prellenar(tipo, hoy)` | `{ inicio, fin, nombre }` para el formulario. Semana: del próximo lunes (hoy si es lunes) al domingo, nombre `"Mi semana del <d> de <mes>"`. Fecha: hoy a hoy, nombre `""`. Viaje: de hoy+7 a hoy+10, nombre `""`. |
| `siguienteBloque(momentos, maxDias)` | Ids de los momentos que **no** están `listo`, ordenados por fecha y luego `dia` antes que `noche`, limitados a los que caen en las primeras `maxDias` fechas distintas. |
| `diasDe(momentos)` | Número de fechas distintas. Es lo que se cobra. |
| `cuotaRestante(perfil, limites, hoy)` | `{ hoy, mes }`: lo que le queda del día y del mes. Si `plan_dias_dia_fecha` no es hoy, el usado del día es 0; si `plan_dias_mes_inicio` no es el primer día del mes de hoy, el usado del mes es 0. |
| `validarOutfits(entrada)` | Ver abajo. |
| `maletaDe(plan, prendas)` | Prendas únicas de los momentos `listo`, agrupadas en este orden: Abrigos y capas, Prendas de arriba, Vestidos, Prendas de abajo, Calzado, Accesorios, Otros. Cada una con `empacada: plan.empacadas.includes(id)`. Los ids que ya no están en `prendas` (borradas) se saltan. Devuelve también `{ total, empacadas }`. |
| `momentosDeHoy(planes, hoy)` | Momentos `listo` con fecha de hoy, con su plan; primero `dia`. |
| `proximoPlan(planes, hoy)` | El plan con `fecha_fin >= hoy` y la `fecha_inicio` más cercana, o `null`. |

### `validarOutfits`

```ts
validarOutfits({
  propuestas: unknown,                        // lo que devolvió la IA, sin confiar en su forma
  momentos: MomentoPlan[],                    // los del bloque
  inventario: { id: string; category: string }[],
  previos: string[][],                        // prenda_ids de los outfits listos fuera del bloque
}): { validos: Record<string, { outfit: OutfitPlan; faltante: Faltante | null }>; errores: Record<string, string> }
```

Reglas, en orden; el primer fallo da el mensaje de error de ese momento (en español, porque se le reenvía a la IA):

1. La propuesta tiene la forma esperada; `momento_id` es de un momento del bloque y no se repite. Los momentos del bloque sin propuesta → error `"Falta el outfit de este momento."`.
2. `titulo` de 1 a 60 caracteres y `descripcion` de 1 a 240 (recortar espacios; si se pasa, recortar en vez de fallar).
3. Todos los `prenda_ids` existen en `inventario` y no se repiten → si no, `"Usaste prendas que no están en el armario: <ids>."`.
4. Entre 2 y `MAX_PRENDAS_OUTFIT` prendas.
5. **Base:** si el inventario tiene `completo` o tiene `arriba` y `abajo`, el outfit debe tener (`arriba` y `abajo`) o `completo`, y no puede juntar `completo` con `abajo`.
6. **Calzado:** si el inventario tiene `calzado`, exactamente 1. Si no tiene, 0.
7. **Abrigo:** si el momento tiene clima con `min <= TEMP_ABRIGO` y el inventario tiene `abrigo`, debe llevar al menos 1.
8. **Sin repetir:** el conjunto de prendas (ordenado) no puede ser igual al de otro outfit del bloque ni al de `previos`.
9. `faltante`: si viene, `categoria` de 1 a 40 caracteres y `motivo` de 1 a 120; si no cumple, se guarda `null` (no es error).

### Tests (`lib/planificacion.test.mjs`)

Mismo estilo que `lib/ventas.test.mjs` (`node:test`, `assert/strict`, import de `./planificacion.ts`). Mínimo:
- `grupoDe` con las categorías reales (`Top`, `Bottom`, `Outerwear`, `Calzado`, `Accesorio`, `Vestido`, `Vestido short`, `Blusa`, `Camisa`) y una desconocida.
- `diasEntre` cruzando fin de mes y de año; `prellenar('semana', …)` en lunes y en miércoles.
- `siguienteBloque`: salta los `listo`, respeta el máximo de fechas, ordena `dia` antes que `noche`.
- `cuotaRestante`: día nuevo, mes nuevo y mismo día.
- `validarOutfits`: un caso válido y uno que rompa cada regla de la 1 a la 8; armario sin calzado (no se exige); frío sin abrigo en el armario (no se exige).
- `maletaDe`: quita duplicados, respeta el orden de grupos, marca empacadas y salta prendas borradas.

## 3. `constants/planes.ts`

Agregar a `MotivoLimite` y `MENSAJES_LIMITE`:
- `solo_elite`: "La planificación es parte de Elite."
- `plan_dia`: "Ya usaste los días de planificación de hoy. Mañana puedes completar el resto."
- `plan_mes`: "Ya usaste los días de planificación de este mes."

## 4. `lib/planificacion.server.ts`

Solo servidor: importa el SDK de Anthropic. Ningún componente cliente debe importarlo (ver el comentario de `types/analisis.ts`).

- `const MODELO_PLAN = "claude-sonnet-5-5"` en una constante, para poder cambiarlo en un solo lugar.
- **Inventario para el prompt:** `{ id, nombre, categoria, color, estilo }` por prenda, cada campo recortado a 60 caracteres (como `corto()` en `app/api/generate-outfits/route.ts`). El color y el estilo salen de las columnas `color` y `style`, o si están vacías, de `metadata.color_principal` y `metadata.estilo`. Se serializa siempre en el mismo orden (`created_at` descendente) para que el caché funcione.
- **Sistema** (texto fijo, en español). Debe decir:
  - Eres estilista. Armas **un outfit por cada `momento_id`** que te pasan, usando **solo** ids del inventario.
  - Toma en cuenta la actividad, el clima (mínima, máxima, lluvia) y si es de día o de noche.
  - Cada outfit lleva parte de arriba y de abajo, o un vestido; un solo calzado; abrigo si la mínima es de 12 °C o menos o si llueve; de 2 a 7 prendas.
  - No repitas un outfit completo de los "ya planeados".
  - En viajes, prefiere repetir prendas versátiles en días distintos para que la maleta sea ligera, sin repetir el outfit completo.
  - Si para una actividad no hay nada adecuado en el armario (por ejemplo, ropa formal para una boda), arma lo mejor posible y llena `faltante` con la categoría y un motivo corto; si no falta nada, `faltante` es `null`.
  - Título de hasta 40 caracteres y descripción de hasta 160, de tú, en español de México. No inventes prendas.
  - Al final se suma `bloquePerfilPrompt(estilo)` de `lib/estilo.ts`, como en la ruta de outfits.
- **Mensaje**, en dos bloques de texto:
  1. `"Inventario:\n" + JSON del inventario`, con `cache_control: { type: "ephemeral" }`. Va primero para que los bloques 2, 3, 4 y 5 del mismo plan lo lean del caché.
  2. Los datos del bloque: nombre y tipo del plan, lugar, los "ya planeados" (`[{ fecha, momento, titulo, prenda_ids }]`) y los momentos a armar (`[{ momento_id, fecha, dia_semana, momento, actividad (o "Día casual" si está vacía), clima }]`).
- **Salida JSON con esquema** (`output_config.format`, el SDK instalado, 0.104.1, ya lo trae). Esquema:
  ```json
  {
    "type": "object", "additionalProperties": false, "required": ["outfits"],
    "properties": { "outfits": { "type": "array", "items": {
      "type": "object", "additionalProperties": false,
      "required": ["momento_id", "titulo", "descripcion", "prenda_ids", "faltante"],
      "properties": {
        "momento_id": { "type": "string" },
        "titulo": { "type": "string" },
        "descripcion": { "type": "string" },
        "prenda_ids": { "type": "array", "items": { "type": "string" } },
        "faltante": { "anyOf": [
          { "type": "null" },
          { "type": "object", "additionalProperties": false, "required": ["categoria", "motivo"],
            "properties": { "categoria": { "type": "string" }, "motivo": { "type": "string" } } }
        ] }
      } } } }
  }
  ```
  Antes de escribir la llamada, cargar la skill `claude-api` y revisar en su doc de TypeScript la forma exacta de `output_config.format` y si el esquema admite `anyOf` con `null`. Si no lo admite, usar `faltante` como objeto obligatorio con `categoria: ""` para decir "no falta nada", y convertirlo a `null` al validar.
- **Llamada:** `client.messages.create({ model: MODELO_PLAN, max_tokens: 16000, output_config: { effort: "medium", format: … }, system, messages })`. No mandar `thinking` (Sonnet 5.5 usa thinking adaptativo por defecto y `disabled` da error 400).
- Revisar `stop_reason` antes de leer: si es `"refusal"` o `"max_tokens"`, lanzar un error propio (`ErrorPlanIA`) para que la ruta devuelva la cuota. Tomar el bloque `type === "text"` (puede haber bloques `thinking` antes) y hacer `JSON.parse`.
- Exportar `generarOutfitsPlan(datos): Promise<{ propuestas: unknown; usos: Anthropic.Usage[] }>`, que hace **como máximo dos llamadas**:
  1. La normal con todos los momentos del bloque.
  2. Si `validarOutfits` dio errores, una segunda llamada solo con los momentos que fallaron. Agrega al bloque 2 del mensaje: `"Corrige estos problemas:\n- <momento_id>: <error>"`, y suma a "ya planeados" los outfits válidos de la primera.
  Devuelve las propuestas ya mezcladas (las válidas de la primera más las de la segunda) y el `usage` de cada llamada.

## 5. `app/api/planificacion/generar/route.ts`

`export const maxDuration = 120`. Body: `{ planId: string, momentoId?: string }`. Sin `momentoId` arma el siguiente bloque; con `momentoId` regenera ese momento ("Otro outfit").

Pasos, en este orden (lo que puede fallar va **antes** de cobrar):

1. Validar que `planId` (y `momentoId` si viene) tengan forma de uuid → 400.
2. `const supabase = await createClient()` (de `@/utils/supabase/server`) y `auth.getUser()` → 401 con `MENSAJES_LIMITE.sin_sesion`.
3. Leer el plan con sus momentos: `.from("planes_outfit").select("*, plan_momentos(*)").eq("id", planId).maybeSingle()`. La RLS ya filtra por usuario; si no llega → 404.
4. Leer `perfiles` (`plan`, `plan_dias_dia`, `plan_dias_dia_fecha`, `plan_dias_mes`, `plan_dias_mes_inicio`) y `limites_plan` (`plan_dias_dia`, `plan_dias_mes`) del plan del usuario. Si el plan no es `elite` → 403 con `{ error: MENSAJES_LIMITE.solo_elite, limite: "solo_elite" }`.
5. Elegir el bloque:
   - Con `momentoId`: ese momento (si no es del plan → 404). Días a cobrar: 1.
   - Sin `momentoId`: `restante = min(cuotaRestante.hoy, cuotaRestante.mes)`. Si es 0 → 429 con `plan_dia` o `plan_mes` (el que se haya agotado). Si no, `siguienteBloque(momentos, min(MAX_DIAS_BLOQUE, restante))`. Si sale vacío → 200 `{ generados: 0, errores: 0, pendientes: 0 }`.
6. Inventario: `.from("prendas").select("id, name, category, color, style, metadata").eq("user_id", user.id).order("created_at", { ascending: false }).limit(300)`. Quitar las donadas (`metadata.donada` en `true` o `"true"`). Si quedan menos de `MIN_PRENDAS_PLAN` → 400 `"Agrega al menos 5 prendas a tu armario para planear."`.
7. Cobrar: `supabase.rpc("usar_dias_plan", { p_dias: dias })`. Si no es `"ok"` → 429 (o 403 para `solo_elite`) con el mensaje de `MENSAJES_LIMITE`.
8. **Desde aquí todo va en un `try`.** Si algo lanza, devolver **todos** los días cobrados con `supabaseAdmin().rpc("devolver_dias_plan", { p_uid: user.id, p_dias: dias })` y responder 500 `"No pudimos armar los outfits. No se descontó de tu cuota."`.
9. Clima: si `plan.lugar` existe, `climaParaFechas(plan.lugar, fechas del bloque, hoy)`. La fecha de hoy se calcula en hora de Ciudad de México (copiar `hoyMexico` de `hooks/use-cuota-ia.ts` a `lib/planificacion.ts` y usarla en los dos lados).
10. Leer el estilo con `leerEstilo(supabase, user.id)` y llamar a `generarOutfitsPlan`. Los "ya planeados" son los momentos `listo` del plan que no están en el bloque.
11. Validar con `validarOutfits` (otra vez, sobre la mezcla final).
12. Guardar con `supabaseAdmin()`, siempre con `.eq("id", momento.id).eq("user_id", user.id)`:
    - válido → `{ outfit, faltante, clima, estado: "listo", generado_en: now }`;
    - inválido en un bloque normal → `{ clima, estado: "error" }`;
    - inválido al **regenerar** → no tocar el momento (se conserva el outfit anterior).
13. Devolver cuota de los días del bloque que quedaron **sin ningún** momento `listo` (al regenerar con error, devolver el 1).
14. Guardar en `uso_ia_registro` (con `supabaseAdmin()`) una fila por llamada: `user_id`, `ruta: "planificacion/generar"`, `modelo`, `entrada: input_tokens`, `salida: output_tokens`, `cache_lectura: cache_read_input_tokens ?? 0`, `cache_escritura: cache_creation_input_tokens ?? 0`. Si este insert falla, solo `console.error`: no debe romper la respuesta.
15. Responder 200 `{ generados, errores, pendientes }`. `pendientes` = momentos del plan que siguen sin estar `listo`.

Agregar este comentario arriba del cobro:
`// shortcut: dos pestañas pidiendo el mismo bloque a la vez cobran dos veces; la pantalla deshabilita el botón mientras genera. Si se ve en uso_ia_registro, bloquear con un estado "generando" por momento.`

## Cómo verificar

1. `node --test lib/*.test.mjs` pasa completo (los tests viejos también).
2. `npx tsc --noEmit` y `npx eslint` de los archivos nuevos sin errores.
3. Prueba real, que **cuesta unos pesos de IA**: con `next dev` y una cuenta Elite del equipo en Chromium, desde la consola del navegador (`evaluate_script` del MCP):
   - crear un plan de 3 días con `supabase.rpc("crear_plan_outfit", …)` (el cliente del navegador se puede crear igual que en `hooks/use-cuota-ia.ts`);
   - llamar `fetch("/api/planificacion/generar", { method: "POST", body: JSON.stringify({ planId }) })` y revisar que los 3 momentos quedan `listo` con prendas reales del armario;
   - llamar otra vez con `momentoId` de uno y revisar que cambia el outfit;
   - revisar `uso_ia_registro`: en la segunda llamada al mismo plan, `cache_lectura` debe ser mayor a 0. Si es 0, el caché no está funcionando (revisar que el inventario y el sistema no cambien entre llamadas).
   - borrar el plan de prueba con `borrar_plan_outfit`.
4. Con una cuenta Plus, la ruta responde 403 sin llamar a la IA.

## Criterios de aceptación

- [x] Tests nuevos y viejos pasan (31 de 31).
- [x] La ruta no cobra si falla antes de llamar a la IA y devuelve la cuota si la IA falla. Lo primero se probó en vivo (cuenta sin Elite: 403 sin cobro). Lo segundo se revisó en el código, no se forzó un fallo de la IA en vivo.
- [x] Ningún componente cliente importa `lib/planificacion.server.ts` (solo la ruta).
- [x] Prueba real hecha y anotada en "Hecho" con los tokens que salieron en `uso_ia_registro`.

## Hecho

Commits en `feat/planificacion-ia` (sale de `92a01dc`). Sin push ni PR.

### Qué se hizo

- `lib/clima.ts`: `describir` movida desde `services/clima.service.ts` (que ahora la importa), `fuenteParaFecha`, `restarUnAnio`, `climaParaFechas` (máximo dos llamadas a Open-Meteo con 8 s de tope, nunca lanza) y `buscarLugares`.
- `lib/planificacion.ts`: tipos, constantes y funciones puras de la tabla del paso 2, más `hoyMexico` (copiada de `hooks/use-cuota-ia.ts`, que no se tocó). Tests en `lib/planificacion.test.mjs`, incluidos `fuenteParaFecha` y `restarUnAnio`.
- `lib/planificacion.server.ts`: sistema fijo, inventario en caché, esquema con `faltante` como `anyOf` null u objeto (la skill `claude-api` confirma que structured outputs admite `anyOf` y `null`), llamada a `claude-sonnet-5-5` con `output_config: { effort: "medium", format: { type: "json_schema", … } }`, sin `thinking`, y segunda llamada solo para los momentos que fallen la revisión.
- `app/api/planificacion/generar/route.ts`: los 15 pasos, con los cambios de abajo.
- `constants/planes.ts`: `solo_elite`, `plan_dia` y `plan_mes`.

### Decisiones fuera del documento

- **Elite antes que el plan.** La ruta lee `perfiles` y revisa Elite antes de leer el plan (pasos 3 y 4 invertidos). En el orden original, una cuenta sin Elite no puede tener planes y recibía 404 en vez de 403. Todo sigue antes del cobro.
- **"Otro outfit" no repite.** Al regenerar, el outfit actual del momento entra a "ya planeados" y a `previos`. Sin esto, la regla 8 no lo veía (el momento está en el bloque) y la IA podía devolver el mismo.
- **Tiempo.** El cliente de Anthropic va con `maxRetries: 0` y un plazo total de 100 s entre las dos llamadas (la segunda solo si quedan 20 s o más). Así un corte lanza dentro del `try` de la ruta y se devuelve la cuota, en vez de que Vercel mate la función a los 120 s sin devolverla. Mauri decidió dejar `maxDuration = 120`; medirlo con un bloque de 7 días en la fase 3.
- **Si falla la corrección,** se guardan los outfits buenos de la primera llamada y solo se pierde la corrección.
- **Orden estable del inventario:** `created_at` y luego `id` descendentes, con los ids como texto, para que el prefijo del caché no cambie entre llamadas.
- **Fallbacks del servidor (decisión de Mauri: hacerlo ahora).** La llamada va por `client.beta.messages.create` con el beta `server-side-fallback-2026-07-01` y `fallbacks: "default"`. En Sonnet 5.5 solo reintenta rechazos de ciberseguridad y de modelos de IA, en Sonnet 5 al mismo precio; los de daños generales, biología y razonamiento no se reintentan y siguen devolviendo la cuota. El SDK 0.104.1 solo tipa la forma con lista de modelos, así que `"default"` va con el tipo forzado. Se toma el **último** bloque de texto (si entra el respaldo, el texto del modelo que rechazó queda antes) y `uso_ia_registro.modelo` guarda el modelo que respondió (`msg.model`), no la constante.
- Duplicados de `prenda_ids` dentro de un outfit dan su propio mensaje ("Repetiste una prenda dentro del outfit.") en vez del de prendas ajenas.

### Prueba real (11 nov 2026, `next dev` en el puerto 3100, Chromium a 390×844)

- **Entrada:** el Turnstile no carga en el Chromium del MCP, así que no se pudo entrar con contraseña. Con OK de Mauri se generó un enlace mágico con `auth.admin.generateLink` (no manda correo) y se abrió en `/auth/callback?token_hash=…&type=magiclink`. Sirve para las pruebas de las fases 3 a 5.
- **Plan:** viaje "Prueba fase 2 Oaxaca", 11 a 13 nov, con 4 momentos (día y noche el 11, día el 12 y el 13), creado con `crear_plan_outfit` por PostgREST con el token de la sesión.
- **Bloque:** 200 `{ generados: 4, errores: 0, pendientes: 0 }` en 9 s. Los 4 quedaron `listo` con prendas reales de su armario. Clima de pronóstico de Open-Meteo (mín 12 y 16 °C, lluvia el 12 y el 13); con mínima de 12 °C, todos llevan abrigo. Los días de lluvia trajeron `faltante` "Impermeable" con un motivo corto.
- **Otro outfit** (día del 11): 200 `{ generados: 1 }` en 5 s. Cambió de `108, 123, 130, 136` a `113, 123, 130, 164, 118`.
- **Cuota:** quedó en 4 días hoy y 4 en el mes (3 del bloque y 1 de la regeneración).
- **Sin Elite:** se cambió `perfiles.plan` de mariela a `gratis` con SQL (decisión de Mauri; no hay cuentas Plus ni gratis del equipo), se llamó al bloque y a la regeneración del mismo plan y se regresó a `elite` (`perfiles` no tiene triggers, así que el cambio no tocó nada más). Las dos respondieron 403 `solo_elite`. La cuota siguió en 4/4 y `uso_ia_registro` en 2 filas: no se llamó a la IA ni se cobró.
- **Limpieza:** plan borrado con `borrar_plan_outfit` (0 planes y 0 momentos). Mariela quedó en `elite`, con 4 de sus 30 días del mes usados.

Tokens en `uso_ia_registro` (precios de Sonnet 5.5: $2 de entrada, $2.50 escribir caché, $0.20 leer caché y $10 de salida por millón, USD; 1 USD = 18 MXN):

| Llamada | Entrada | Salida | Caché leído | Caché escrito | Costo |
|---|---|---|---|---|---|
| Bloque de 3 días (4 momentos) | 542 | 706 | 0 | 3,897 | ~$0.018 USD, ~$0.32 MXN |
| Otro outfit (1 momento) | 431 | 171 | **3,897** | 0 | ~$0.003 USD, ~$0.06 MXN |

- El caché funciona: la segunda llamada leyó todo el prefijo (sistema más el inventario de 46 prendas).
- Por día planeado salió ~$0.11 MXN, debajo de los ~$0.17 estimados en el README. La salida incluye el razonamiento; un bloque de 7 días con 2 momentos por día se medirá en la fase 3.

### Pendiente para fases siguientes

- Medir el tiempo de un bloque de 7 días (14 momentos) contra el plazo de 100 s.
- Revisar en los logs si aparece `La IA no terminó: refusal`; los rechazos por daños generales no tienen respaldo.
