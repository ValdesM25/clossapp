# Fase 5: "Quiero ser centro de acopio" y panel de admin (rama `feat/solicitudes-acopio`)

## Qué hace, en una línea

Cualquier negocio puede pedir ser centro de acopio desde la app, y Mauri revisa y aprueba las solicitudes en `/admin`. Al aprobarse, esa cuenta abre el portal del centro.

## Decisión de Mauri

Después de leer `docs/estrategia-centros-acopio.md` pidió: "construye primero el formulario y el panel de admin".

## Cómo funciona

1. El negocio **crea una cuenta normal** (correo o Google). Se recomienda usar el correo del negocio.
2. Entra a **`/centros`** (enlace en el login y en el menú de avatar: "Quiero ser centro de acopio") y llena el formulario: nombre, tipo de negocio, dirección, ciudad, horario, cuántas bolsas puede guardar, persona responsable, teléfono y un mensaje opcional.
3. La solicitud queda **pendiente**. Si vuelve a `/centros`, ve el estado.
4. Mauri entra a **`/admin`** ("Panel de admin" en el menú, solo visible para él). Ve las solicitudes por pestaña (pendientes, aprobadas y rechazadas) con el correo de la cuenta para contactarla, escribe una nota opcional y **aprueba o rechaza**, con un paso de confirmación.
5. **Al aprobar, esa misma cuenta pasa a rol `acopio`**, con el nombre del negocio. La próxima vez que entre, va directo al portal.
6. Si se rechaza, la persona ve la nota y puede enviar una nueva.

**Decisión mía:** aprobar no manda invitación por correo. Usa la cuenta que ya existe, así no depende de la service key ni del SMTP, que todavía no están configurados. Cuando el SMTP esté listo, se puede agregar un correo de "tu centro fue aprobado".

## Cambios en la base: `supabase/10-solicitudes-acopio.sql` (aplicada)

- **`perfiles.es_admin`:** marca aparte del rol, para que Mauri siga usando la app normal. Nadie se la puede dar a sí mismo.
  - Se activó para la cuenta **`mau.valdes09+clossapp@outlook.com`** (el correo de los commits de Mauri). **Supuesto mío:** si no es su cuenta, se cambia con un `update`.
- **Tabla `solicitudes_acopio`** con límites de largo y formato de teléfono, y **una sola solicitud pendiente por cuenta** (evita spam).
  - RLS: cada quien ve la suya y el admin ve todas; solo se puede crear como pendiente; nadie la edita directo.
- **`revisar_solicitud(id, decisión, nota)`:** solo admin. Aprueba o rechaza una vez; al aprobar asigna el rol `acopio`.
- **`solicitudes_con_correo()`:** solo admin. Devuelve el correo de cada solicitud para contactarla.

**Prueba con reversión en la base real:**

| Prueba | Resultado |
|---|---|
| Se marca la cuenta de Mauri como admin | sí |
| Enviar solicitud | ok |
| Segunda solicitud pendiente | bloqueada |
| Aprobarse sola | `SOLO_ADMIN` |
| Editarla directo | 0 filas |
| Darse admin | bloqueado |
| Otra cuenta ve solicitudes ajenas | 0 |
| Admin ve la solicitud y el correo | sí |
| Aprobar | la cuenta pasa a `acopio` / "Lavandería Sol" |
| Revisar otra vez | `YA_REVISADA` |

## Cambios en la app

| Archivo | Cambio |
|---|---|
| `app/centros/page.tsx` (nuevo) | Página pública con beneficios y formulario; muestra el estado si ya hay solicitud. |
| `app/admin/page.tsx` (nuevo) | Panel de solicitudes. La base decide si eres admin (`es_admin()`); si no, muestra "solo para administración". |
| `lib/solicitudes.ts` (nuevo) | Tipos y validación en español, iguales a las reglas de la base. |
| `hooks/use-auth.ts`, `context/auth-context.tsx` | Leen `es_admin` para mostrar el acceso al panel. |
| `user-avatar-menu.tsx` | "Quiero ser centro de acopio" y "Panel de admin" (solo admin). |
| `login-view.tsx` | Enlace "Quiero ser centro de acopio". |

## Pendiente / ideas siguientes

- Después de crear la cuenta, la persona tiene que volver a `/centros` por su cuenta; el login todavía no la regresa sola.
- Fotos del local en la solicitud (requiere un bucket de storage).
- Correo automático al aprobar o rechazar (cuando haya SMTP).
- Mapa de centros en la app.

## Cómo se verificó

- `tsc` y `build` sin errores.
- Migración probada con reversión (tabla de arriba) y aplicada.
- Capturas en Chromium de `/centros` y `/admin` sin sesión. **No probé con sesión iniciada:** el entorno local usa la base de producción y no creo cuentas ahí. Mauri puede probarlo entrando con su cuenta a `/admin` y con otra cuenta a `/centros`.
