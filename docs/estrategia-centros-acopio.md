# Estrategia: centros de acopio, donaciones y destino de la ropa

> Propuesta para que Mauri la revise. Las ideas son sugerencias, no decisiones. Lo que ya existe en la app está marcado con ✅. Lo que habría que construir, con 🔨.

## 1. Qué es un centro de acopio en Clossapp

Un negocio o institución que:
1. **Recibe donaciones de ropa.** La persona llega con su bolsa y un QR generado en la app (✅).
2. **Es punto de entrega seguro del marketplace.** Ahí se recogen las compras y rentas, y el pago se libera al escanear (✅ escrow).
3. **Clasifica** lo recibido y lo manda a su destino (sección 5).

## 2. Cómo se registra un centro nuevo

**Hoy (manual, funciona ya):**
1. Supabase → Authentication → "Invite user" con el correo del centro.
2. El centro abre el correo y elige su contraseña.
3. Asignar el rol con SQL (o pídemelo):
   ```sql
   update perfiles set rol = 'acopio', punto_acopio_id = 'centro-norte', punto_acopio_nombre = 'Centro Norte - San Patricio'
   where user_id = (select id from auth.users where email = 'correo@del-centro.com');
   ```
4. Al entrar, ese correo va directo al portal de recolección.

**Propuesta para escalar (🔨):**
1. Página pública **"Quiero ser centro de acopio"** con un formulario: nombre del negocio, dirección, horario, capacidad aproximada (bolsas por semana), contacto y fotos del espacio.
2. Las solicitudes llegan a un **panel de administración** de Mauri (rol `admin`).
3. Al aprobar, la app manda la invitación y asigna el rol sola. El centro aparece en el **mapa de puntos** de la app.
4. **Requisitos mínimos sugeridos:**
   - espacio seco para guardar al menos 20 bolsas;
   - horario fijo de atención;
   - una persona responsable con teléfono;
   - que acepte la verificación con QR (no recibir sin escanear).

## 3. Qué gana un centro (por qué querría serlo)

Ordenado de más fácil a más trabajo:

| Incentivo | Cómo funciona | Costo para Clossapp |
|---|---|---|
| **Visitas a su local** | Cada donante y cada entrega del marketplace es una persona que entra a su negocio. | 0 |
| **Visibilidad** | Aparece en el mapa de la app con insignia de "Punto verde Clossapp" y en redes. | Bajo |
| **Reporte de impacto mensual** | Prendas recibidas, CO₂ y agua evitados, familias apoyadas. Le sirve para su marketing o su programa de responsabilidad social. | Bajo (la bitácora ya existe ✅) |
| **Comisión por entregas** | Un porcentaje o monto fijo por cada entrega del marketplace que pasa por su local. | Medio (sale de la comisión de Clossapp) |
| **Cupones propios** | El centro da un cupón a quien dona ("10% en tu próxima visita"), así el donante vuelve a comprar. | 0 para Clossapp |
| **Premium gratis** | El negocio y su equipo tienen Clossapp Pro. | Bajo |

**Sugerencia:** empezar con los primeros tres, que cuestan casi nada, y sumar la comisión cuando haya volumen en el marketplace.

**Buenos candidatos:** tiendas de ropa y boutiques, lavanderías, tintorerías, cafeterías, escuelas y universidades, oficinas con programa social, parroquias y ONGs.

## 4. Qué motiva a donar

| Motivo | Cómo | Estado |
|---|---|---|
| **Puntos** | Puntos por donación, canjeables por descuentos en Pro. | ✅ |
| **Ver el impacto** | "Tus 5 prendas llegaron a un albergue en Saltillo". Avisar a dónde fue cada bolsa. | 🔨 |
| **Recordar lo que no se usa** | Estadísticas ya muestra "prendas olvidadas". Sugerir: "llevas 6 meses sin usar estas 4, ¿las donas?" | ✅ datos / 🔨 sugerencia |
| **Campañas por temporada** | Puntos dobles en invierno (abrigos), regreso a clases (uniformes) o tras un desastre. | 🔨 |
| **Insignias y rachas** | "Donante bronce, plata, oro". | 🔨 |
| **Comprobante fiscal** | Si se trabaja con **donatarias autorizadas**, el donativo en especie *podría* ser deducible. **Hay que confirmarlo con un contador**; no lo puedo asegurar. | Por confirmar |

## 5. A dónde va la ropa

Al recibir, el centro clasifica en tres grupos (🔨 un selector simple en el portal):

| Grupo | Qué entra | Destino |
|---|---|---|
| **A. Reventa** | En buen estado, con marca o en demanda. | **Marketplace de Clossapp.** Lo que se vende financia la logística, y una parte puede ir a la causa. |
| **B. Donación directa** | Útil pero sin valor de reventa. | Albergues, casas hogar, bancos de ropa, apoyo en desastres, y **ropa para entrevistas de trabajo** con programas de empleo. |
| **C. Fin de vida** | Rota, manchada o muy gastada. | **Upcycling** con diseñadores locales o **reciclaje textil** (fibra, relleno, trapo industrial). |

**Para generar confianza:** cada donante debería poder ver a qué grupo fue su ropa y, cuando se pueda, el destino final. Hoy la bitácora guarda quién, cuánto y cuándo (✅), pero no el destino (🔨).

## 6. Logística básica

1. **Recepción:** QR por bolsa (✅). El centro puede corregir la cantidad real de prendas al validar (✅, tope de 30 por bolsa).
2. **Capacidad:** cada centro declara cuántas bolsas puede guardar. Al llegar al 80%, la app avisa a Clossapp y deja de recomendar ese centro (🔨).
3. **Recolección:** ruta semanal o quincenal según volumen. Al principio, Mauri o un voluntario; después, un servicio de mensajería.
4. **Clasificación:** en el centro (más rápido) o en una bodega central (más control). **Sugerencia:** empezar en el centro, con el selector A/B/C.
5. **Entrega a destinos:** acuerdos fijos con 2 o 3 organizaciones receptoras y una empresa de reciclaje textil.
6. **Registro:** todo queda en la bitácora para el reporte de impacto.

## 7. Plan para empezar (sugerencia)

1. **Piloto con 2 o 3 centros** en una ciudad, con registro manual (sección 2, "hoy").
2. Un acuerdo con **una** organización receptora (grupo B) y **una** de reciclaje (grupo C).
3. Medir durante 1 o 2 meses: bolsas por semana, tiempo de recolección, cuánto va a cada grupo y cuántos donantes repiten.
4. Con esos datos, decidir comisiones, panel de administración y la página de registro.

## 8. Preguntas para Mauri

1. ¿En qué ciudad empieza el piloto, y tienes ya centros o negocios en mente?
2. ¿La clasificación A/B/C la hace el centro o prefieres una bodega central?
3. ¿Qué parte de lo que se revende va a la causa y qué parte a operar Clossapp?
4. ¿Con qué organizaciones receptoras te gustaría trabajar (albergues, programas de empleo, alguna ONG en particular)?
5. ¿Quieres que construya primero el **formulario "Quiero ser centro" + panel de admin**, o el **selector A/B/C con el reporte de impacto**?
