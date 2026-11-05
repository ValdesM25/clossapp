# Tanda planes: límites, UX de límites y seguridad contra drenaje de IA

Pedido de Mauri (2026-11-05): planear toda la lógica de planes antes de invitar a amigos (ingenieros) a usar la app, con énfasis en que nadie pueda drenar los créditos de la API de Claude.

Rama: `feat/planes-limites`. Estado: **fases 1 y 2 hechas (código + SQL probado con rollback); SQL 15 y 16 aplicados en producción el 2026-11-05; fase 3 (UX de límites) pendiente.**

## Hecho en esta rama

**Rutas de IA (fase 1)**
- `generate-outfits`: el armario ya no viene del body; el servidor lee hasta 100 prendas del usuario de la sesión y recorta cada campo (120 caracteres, 6 claves de metadata). El contexto se recorta a 300. El cliente ya no manda el armario y no llama si está vacío (para no gastar el outfit del día).
- `analyze-prenda`: rechaza fotos de más de ~1.5 MB (base64) y tipos que no sean jpeg/png/gif/webp, antes de cobrar el análisis. El cliente manda fotos de 800 px (~100 KB), así que no le afecta.
- `/api/recommend` **borrada**: nada la llamaba y era una puerta más a Claude.
- `/api/renta`: el dueño sale de la sesión, no del `user_id` del body.

**Cuotas en la base (fase 2)** — `supabase/15-limites-plan.sql`
- Tabla `limites_plan` (free: 50 prendas, 10 análisis/día, 60 de por vida, 1 outfit/día, fusible 200/día; premium: 30 análisis/día, 15 outfits/día, sin fusible). Se cambia con un `update`, sin deploy.
- `usar_ia(p_tipo)` reemplaza a `consumir_cuota`: devuelve `ok` o el motivo (`outfit_dia`, `analisis_dia`, `analisis_total`, `global`, `sin_sesion`); `lib/cuota.server.ts` lo traduce a un mensaje (429 con `limite`).
- Fusible: tabla `uso_ia_dia`, una fila por día y plan; nadie la lee ni escribe desde el cliente.
- Los mensajes de límite ya no dicen "pásate a Premium" porque premium también los ve; ofrecer premium lo hará la UI (fase 3) solo a cuentas gratis.
- `consumir_cuota` se queda viva hasta el deploy (el código actual la usa). Después: `drop function public.consumir_cuota(text);`

**Probado en la base real con rollback:** free 2.º outfit, 11.º análisis del día, análisis 61 y prenda 51 → rechazados; fusible lleno → `global`; premium análisis 31 y outfit 16 → rechazados; sin sesión → rechazado; desde el cliente no se puede cambiar `plan`, contadores ni límites, ni leer el fusible.

## Fase 3: UX de límites (rama `feat/limites-ux`)

- `hooks/use-cuota-ia.ts`: lee los contadores del día de `perfiles` y los límites del plan de `limites_plan`. Solo informa; quien decide sigue siendo `usar_ia` en el servidor. "Hoy" es el día de México, igual que en la base.
- **Simulador (Outfit):** las cuentas gratis ven "Outfits con IA hoy: 0/1 · Plan gratis". Si ya lo usaron, el aviso aparece antes de pulsar y el botón se desactiva. Los avisos de límite traen "Ver planes", solo en plan gratis.
- **Subir prenda:** las cuentas gratis ven "Análisis con IA hoy: 3/10 · 57 de 60 restantes en tu plan", y se actualiza al terminar cada análisis. Aquí no hay "Ver planes": cambiar de pantalla cerraría el modal y se perdería la foto elegida. El aviso ya dice que se puede llenar a mano.
- **Premium:** no ve contadores (su tope es oculto) ni ofertas de plan. Perfil ya ocultaba "Planes y puntos" para premium.

## Hallazgo: las cuentas nuevas no podían guardar prendas

`prendas.user_id` tiene FK a `usuarios_permitidos(id)`, y el trigger `handle_new_user` insertaba `new.id::text` en una columna `uuid`: fallaba siempre y el `exception when others` lo escondía. Solo 2 de 9 cuentas estaban en esa tabla; **ninguna registrada desde la app (las 3 gratis) podía subir prendas**. Lo mismo le pasaría a cada amigo invitado.

Arreglo en `supabase/16-usuarios-permitidos-registro.sql`: trigger corregido (con `search_path` fijo, username único si dos correos comparten la parte antes de la @, y un `warning` en logs si algo falla) + relleno de las 7 cuentas faltantes. Probado con rollback creando dos usuarios de prueba.

## Costo del fusible (estimado)

Precios: `claude-sonnet-5` $2 / $10 por millón de tokens (entrada/salida); `claude-haiku-4-5` $1 / $5. Una foto de 800 px son ~850 tokens.

| Llamada | Costo aprox. |
|---|---|
| Análisis de 1 foto (alta) | ~$0.005 |
| Tasación de venta (hasta 10 fotos) | hasta ~$0.04 |
| Outfit (armario de 50 prendas) | ~$0.007 |

Fusible en **200** llamadas gratis al día (decisión de Mauri, 2026-11-05): uso normal ~$1-1.5 USD/día; peor caso (todas tasaciones de 10 fotos) ~$8/día. Cambiarlo: `update limites_plan set tope_global_dia = N where plan = 'gratis';`

## Advisors de Supabase (2026-11-05)

Nada grave para la IA. Pendientes menores: activar "leaked password protection" en Auth; `rls_auto_enable` es ejecutable por `anon` (revisar qué es); las tablas aparecen en el esquema GraphQL (solo nombres, RLS protege los datos).

## Decisiones de Mauri

| Tema | Decisión |
|---|---|
| Pago / cambio a premium | Pendiente. Stripe va fuera de la app; por ahora solo se asume que la cuenta es `gratis` o `premium`. |
| Free: prendas | 50 a la vez (como hoy). |
| Free: outfits IA | 1 al día. El anuncio previo va después, con el issue #9. |
| Free: análisis IA de fotos | Tope diario + de por vida: **10 al día, 60 en total** (valores iniciales, se pueden ajustar). |
| Premium | Tope diario oculto de uso justo: **30 análisis y 15 outfits al día**. |
| "Multicuentas" | Evitar que una persona cree varias cuentas para multiplicar su cuota. |

Qué es un "análisis": cada foto subida la revisa `claude-sonnet-5` para llenar nombre, categoría, color, etc. Es el gasto más alto de la app. El tope de por vida existe porque, sin él, borrar y volver a subir prendas permite análisis infinitos sin pasar de 50 prendas.

## Lo que ya está bien (no tocar)

- `lib/cuota.server.ts` → `exigirCuota`: el usuario se toma de la sesión, no del body, y la cuota se descuenta en la base (`consumir_cuota`, security definer).
- `perfiles`: el usuario no puede cambiar `plan` ni contadores (`supabase/05-perfiles.sql`, solo tiene grant en columnas de estilo/perfil).
- El tope de prendas vive en un trigger, así que un insert directo tampoco lo salta.

## Fase 0: antes de invitar a nadie (sin código)

1. **Consola de Anthropic: límite de gasto mensual + alerta.** Es la red de seguridad de todo lo demás.
2. Supabase Auth: confirmar que estén activos **confirmación de correo** y **CAPTCHA (Turnstile)** en el registro.
3. Correr los advisors de seguridad de Supabase y revisar RLS de todas las tablas.

## Fase 1: endurecer las rutas de IA

- `app/api/generate-outfits` y `app/api/recommend`: hoy aceptan `wardrobe`/`prendas`/`contexto`/`clima`/`ocasion` del body sin límite, así que un solo outfit puede llevar un prompt gigante. Cambio: el servidor lee las prendas del usuario desde la base (ignorar las del body) y recorta los textos libres (~200 caracteres).
- `app/api/analyze-prenda`: limitar los bytes de cada imagen (~5 MB) y aceptar solo `image/jpeg|png|webp`.
- Revisar que `/api/push/enviar` y `/api/renta` exijan secreto o sesión.

## Fase 2: cuotas en la base, en un solo lugar

- Tabla `limites_plan` (`plan`, `prendas`, `analisis_dia`, `analisis_total`, `outfits_dia`), legible por `authenticated`. La usan `consumir_cuota`, el trigger de prendas y la UI. Así desaparece la copia de los números entre `constants/planes.ts` y el SQL.
- `perfiles`: agregar un contador de análisis del día (como ya existe el de outfits).
- `consumir_cuota` aplica los topes de free y de premium.
- **Fusible global contra multicuentas:** un contador diario de llamadas de cuentas gratis (todas juntas). Si se pasa de N, se niega la IA gratis hasta el día siguiente. Aunque alguien cree 100 cuentas, el gasto del día queda acotado. **N por definir con Mauri** según el costo real por llamada.
- Opcional, si hace falta: bloquear dominios de correo desechable al registrarse.

## Fase 3: UX de planes y límites

- Un hook de plan y uso (plan + contadores + límites), alimentado por `perfiles` y `limites_plan`.
- **Planes** hoy solo se abre desde Perfil (`components/views/perfil/perfil-view.tsx:133`), no desde la navbar inferior. Con premium, Perfil muestra "Tu plan: Premium" en lugar del botón de mejorar, y ningún aviso ofrece subir de plan.
- Al llegar a un límite (la API ya responde 429 con `limite`), mostrar un aviso con qué se acabó y cuándo se renueva:
  - Outfit: "vuelve mañana".
  - Análisis: se sigue pudiendo subir la prenda llenando los datos a mano.
  - Prendas: borrar alguna o pasarse a premium.
- Contadores visibles para free: "48/50 prendas", "outfit de hoy usado", "análisis hoy 3/10".

## Después (fuera de esta tanda)

- Anuncio antes del outfit gratis (issue #9). Nota: en web el anuncio no se puede verificar en servidor; saltárselo solo cuesta el ingreso del anuncio, no créditos, porque el tope de 1/día sigue en servidor.
- Webhook de Stripe que cambie `perfiles.plan` con la service role.
- Bucket privado (issue #8, `docs/tanda-fixes-pwa/pendiente-storage-privado.md`).

## Cómo se va a verificar

- SQL probado en la base real dentro de una transacción con rollback: cada tope (free y premium), el fusible y que `plan`/contadores no se puedan editar desde el cliente.
- Con una cuenta free: llegar a cada límite desde la app y con `curl` directo; mandar un body inflado y un `user_id` falso.
- `tsc` y `build` (sin `next dev` corriendo).
