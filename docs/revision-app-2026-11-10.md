# Revisión de la app: 10 de noviembre de 2026

Qué pediste: revisar inicio de sesión, invitación a registrarse, recuperar contraseña, suscripciones, botones y bugs en general; recomendación de color (sin aplicarla); video de cómo instalar en iOS.

Cómo se revisó: lectura del código, `tsc` (sin errores), `eslint` (0 errores, 122 avisos ya existentes), `node --test lib/plan-stripe.test.mjs` (pasa), lectura de RLS, triggers y límites en Supabase, lectura de la configuración de Stripe en producción (webhook, portal, precios, códigos promocionales) y un recorrido automático en un iPhone simulado (Chromium sin interfaz) sobre `localhost`, pulsando cada botón de la demo.

No se pudo probar en `www.clossapp.com` desde esta máquina: la red pasa por un proxy Fortinet que reemplaza el certificado TLS, y no se desactivó la verificación del certificado. Tampoco se pudo leer la configuración de Auth de Supabase (plantillas de correo, URLs de redirección): no hay acceso a eso desde las herramientas.

## Lo que se arregló (rama `fix/login-registro-recuperar`, commit 588b372, sin push)

| # | Bug | Arreglo |
|---|---|---|
| 1 | Si no estás registrado y tratas de entrar, solo dice "Correo o contraseña incorrectos." No invita a registrarse. | Debajo del error aparece "¿Aún no tienes cuenta? **Créala gratis** con este correo, o **recupera tu contraseña**". Los botones cambian de pestaña y conservan el correo. Supabase no revela si un correo existe (es a propósito), por eso se invita en los dos sentidos. |
| 2 | El login recortaba los espacios de la contraseña (`password.trim()`) y el registro no. Quien creó su contraseña con un espacio al inicio o al final no podía entrar nunca. | Se manda la contraseña tal cual, igual que en el registro. |
| 3 | Si el script de Turnstile no carga (bloqueador de anuncios, Brave, red de la escuela/oficina), el botón se queda en "Verificando…" deshabilitado para siempre, sin explicación. Se reprodujo en local. | Aparece "No cargó la verificación anti-robots. Desactiva el bloqueador de anuncios o recarga la página." |
| 4 | En `/restablecer`, cualquier error decía "El enlace expiró o ya se usó", aunque el problema fuera que la contraseña nueva es igual a la anterior o es débil. La persona pedía otro correo sin necesidad. | Mensaje según el código de Supabase (`same_password`, `weak_password`, resto = enlace vencido) y confirmación "Listo, tu contraseña cambió" antes de entrar. |
| 5 | Cambiar contraseña desde Perfil no validaba la regla de 8 caracteres con letras y números; si Supabase la rechazaba, decía "Error al actualizar la información" aunque nombre y foto sí se habían guardado. | Valida antes de guardar y, si falla solo la contraseña, lo dice. |
| 6 | Toda cuenta real sin foto mostraba la foto de stock de una mujer (Unsplash) como su avatar. | Sin foto se ve la inicial del nombre. La demo conserva su foto de ejemplo. |
| 7 | Al cerrar sesión no se limpiaba el avatar: si en el mismo navegador entraba otra cuenta sin foto, veía la foto de la cuenta anterior (o la del centro de acopio de la demo). | Se limpia en los tres caminos de salida. |

Probado: `tsc` sin errores; `eslint` en los archivos tocados sin avisos nuevos (uno menos). En el navegador: el aviso de Turnstile aparece cuando el script no carga; con la respuesta de Supabase "Invalid login credentials" simulada aparece la invitación, y "Créala gratis" deja la pestaña en "Crear cuenta" con el correo puesto. Captura: `docs/revision-app-2026-11-10-invitacion.png`.

## Bugs encontrados que NO se arreglaron (decisión tuya)

Ordenados del más grave al menos grave.

### Suscripciones y dinero

| # | Gravedad | Bug | Qué pasa | Propuesta |
|---|---|---|---|---|
| 8 | Alta | **Los cupones del canje de puntos no sirven.** `canjear_puntos` descuenta los puntos y entrega un código como `DONA50OFF-3F9A1C`, pero en Stripe hay 0 códigos promocionales y el checkout no tiene `allow_promotion_codes`. | La persona gasta 400, 800 o 1500 puntos y recibe un código que no puede usar en ningún lado. | Opción A: crear en Stripe un cupón por cada opción y generar un código promocional real de un solo uso al canjear (desde el servidor). Opción B: aplicar el descuento directo a la suscripción con el ID del cupón. Mientras tanto, desactivar el canje. |
| 9 | Alta | **Plus promete "Outfits con IA ilimitados"** pero `limites_plan` le da 15 al día. | Publicidad que no se cumple; alguien que paga se topa con "Ya usaste tus outfits con IA de hoy". | Cambiar el texto a "15 outfits con IA al día" o subir el límite. |
| 10 | Alta | **Elite promete "Modelos de IA frontier" y "Planificación de outfits"**. Ninguna de las dos existe: todos los planes usan `claude-haiku-5-5` para outfits y `claude-sonnet-5-5` para análisis; no hay planificación. | Se cobran $99 por cosas que no hay. | Quitar esas líneas hasta que existan, o implementar el modelo por plan. **Hecho en `integracion/elite` (11 nov):** la planificación existe (tanda `docs/planificacion-outfits/`) y "modelos frontier" se cumple con Sonnet 5.5 en la planificación (decisión de Mauri, P2). Llega a producción con el PR final. |
| 11 | Media | **Plus promete "Vender y rentar en el Shop" y "Estadísticas avanzadas"**. El plan gratis también puede vender y rentar, y no hay estadísticas distintas por plan. | No es un diferenciador real. | Quitar o implementar. |
| 12 | Media | **Doble suscripción posible.** Al volver de Stripe, `/planes` espera 20 s al webhook; si tarda más, muestra "se está procesando" pero también los botones "Elegir Plus/Elite". El servidor solo bloquea si `perfiles.plan` ya es de pago. | Un segundo clic abre otro checkout y se cobra dos veces. | En `/api/stripe/checkout`, revisar también `stripe.subscriptions.list({ customer, status: "all" })` y bloquear si hay una activa, en prueba o incompleta; y ocultar los botones mientras se espera. |
| 13 | Media | El canje dice "Suscripción Pro" / "ClossApp Pro". Ese plan no existe (son Plus y Elite). | Confuso. | Cambiar el texto en `constants/donaciones.ts`. |
| 14 | Baja | En el portal de Stripe cada plan tiene `adjustable_quantity` activado. Hoy no se ve porque `default_allowed_updates` solo trae `price`, pero si alguien activa "quantity" se podrían comprar 3 Plus. | Riesgo de configuración. | Desactivar `adjustable_quantity` en el portal. |
| 15 | Baja | El portal no tiene URL de términos ni de privacidad. | Stripe las muestra si existen. | Poner `/politicas#terminos` y `/politicas#privacidad`. |

Lo que sí está bien en suscripciones: el webhook escucha `checkout.session.completed` y `customer.subscription.created/updated/deleted/paused`, verifica la firma y relee la suscripción (no le importa el orden de los avisos); el portal permite cambiar entre Plus y Elite con prorrateo y cancelar al final del periodo; precios $59 y $99 MXN con IVA incluido; `plan` no lo puede escribir el usuario (solo tiene UPDATE en nombre, teléfono, avatar, estilo, onboarding); RLS deja ver solo el perfil propio; past_due conserva el plan mientras Stripe reintenta.

### Registro y entrada

| # | Gravedad | Bug | Propuesta |
|---|---|---|---|
| 16 | Media | Si alguien sin cuenta elige un plan en `/planes`, se registra y confirma desde el correo, el enlace abre otra pestaña: el "volver a /planes" vive en `sessionStorage` y se pierde. Cae en Inicio y no regresa a pagar. | Guardar el destino en `localStorage` con caducidad, o pasarlo en `emailRedirectTo` como `next`. |
| 17 | Media (verificar) | La recuperación y la confirmación solo funcionan si abres el correo en otro dispositivo o desde la app instalada en iPhone (que tiene almacenamiento separado de Safari) **si las plantillas de correo usan `token_hash`**, como dice el checklist de `docs/tanda-registro-pwa/fase-1-registro-planes.md`. Con la plantilla por defecto (`code`), el enlace falla y se ve "El enlace expiró". No se pudo comprobar desde aquí. | Revisar en Supabase → Authentication → Emails → Templates. |
| 18 | Baja | Al terminar la guía de la demo, "Crear mi cuenta" te deja en la pestaña "Iniciar sesión", no en "Crear cuenta". | Pasar el modo inicial al login. |
| 19 | Baja | El aviso "Instala Clossapp" solo aparece en Inicio con cuenta; no en el login ni en la demo. Quien solo prueba la demo nunca lo ve (la guía de la demo sí trae un paso de instalación en iOS). | Decidir si mostrarlo también en el login. |
| 20 | Baja | Al entrar se lee el perfil dos veces (lo hace `login` y también el evento `SIGNED_IN`). | Dejar solo el del evento. |

### Otros

| # | Gravedad | Bug | Propuesta |
|---|---|---|---|
| 21 | Baja | "Copiar código" del canje usa `navigator.clipboard` sin `catch`: en navegadores que lo bloquean, falla sin avisar. | `try/catch` con mensaje. |
| 22 | Baja | Next avisa que `middleware.ts` está obsoleto; ahora se llama `proxy.ts`. | Renombrar cuando convenga. |

## Botones (recorrido automático de la demo de usuario)

Se pulsaron 78 controles en Inicio, Armario, Outfit, Shop y Perfil (iPhone simulado, uno por uno, volviendo al estado inicial entre cada clic). Todos los enlaces llevan a donde dicen (`/politicas`, `mailto:support@clossapp.com`). Sin errores de JavaScript.

Los que no cambiaron nada en pantalla:
- Chips de ocasión y clima en Outfit, "Todos" y "COMPRAR" en Shop: son filtros que ya estaban activos o solo cambian de estilo. Funcionan bien.
- "Agregar prenda" (botón flotante y el del encabezado) y "Nueva" reparación en Armario: en la demo están bloqueados con candado a propósito, pero no dicen nada al tocarlos. Ver bug 23.

| # | Gravedad | Bug | Propuesta |
|---|---|---|---|
| 23 | Media | En la demo, la acción principal de la app ("Agregar prenda") no hace nada al tocarla; solo se ve un candado gris. Quien prueba la demo no entiende por qué. | Al tocar, mostrar "Crea tu cuenta para subir tus prendas" con botón a "Crear cuenta". |
| 24 | Media | **La tabla `puntos_acopio` no existe en producción** (la consulta responde 404). Al donar, todos ven tres centros genéricos escritos en el código ("Punto de acopio Centro", "Norte", "República"), sin dirección, en lugar de los centros reales. | Aplicar la parte de `supabase/03-acopio-registros.sql` que crea `puntos_acopio`, o leer los centros de `solicitudes_acopio` aprobadas. |


## Recomendación de color (no aplicada)

El blanco y negro editorial funciona y le da a la app cara de revista de moda. Lo que falta es **un solo color de acento** que se use poco y siempre para lo mismo: la acción principal y lo "tuyo" (plan, puntos, logros). Más de un acento le quitaría lo editorial.

Tres opciones (todas pasan AA como texto sobre blanco):

| Opción | Color | Contraste sobre blanco | A favor | En contra |
|---|---|---|---|---|
| Terracota | `#B4532A` + fondo suave `#F3E9DF` | 5.0:1 | Cálido, de moda, se ve bien junto a fotos de ropa; resalta sin gritar. | Cerca del naranja de alerta; hay que cuidar que no se confunda con errores (los errores siguen en rojo). |
| Oliva / salvia | `#4F6146` + fondo `#E8EDE4` | 6.7:1 | Habla de sustentabilidad: donar, reutilizar, rentar. Muy calmado. | Menos llamativo en botones de pago. |
| Burdeos | `#7A1F2B` | 10.2:1 | El más "lujo" y editorial; queda muy bien en Elite. | Sobre negro casi no se ve (1.7:1); sirve solo sobre fondos claros. |

Dónde usarlo, sin tocar lo demás:
- Botón principal de cada pantalla ("Crear cuenta", "Elegir Plus", "Me lo pongo hoy").
- Etiqueta "Más popular" de Plus y el borde del plan destacado.
- Pestaña activa del menú inferior (el ícono, no el fondo).
- Puntos y logros (saldo de puntos, "¡Registrado como usado hoy!").
- El fondo suave para avisos informativos (hoy `bg-zinc-50`).

Lo que no cambiaría: textos, títulos, bordes y la tarjeta oscura de "Sugerencia IA de hoy" siguen en negro y grises. Para aplicarlo bastaría con una variable `--acento` en `app/globals.css` y usarla en esos lugares.

Mi preferida para esta app es la terracota, porque combina con las fotos de ropa y le da calidez sin perder lo editorial; la oliva es mejor si quieres que pese más lo de donar y reutilizar.

## Video: cómo instalar en iPhone

`brag-output/instalar-ios/brag.mp4` (vertical 1080×1920, 18 s, con música). Muestra Safari con Inicio y el aviso real "Instala Clossapp", y sigue sus 3 pasos: Compartir → Añadir a pantalla de inicio → Añadir, hasta el icono en la pantalla de inicio. Póster en `brag.jpg`, texto para compartir en `share-copy.txt`, guion en `brag-plan.md`. La interfaz de Safari y la hoja de compartir son recreaciones; el nombre "Sofía" es ficticio.
