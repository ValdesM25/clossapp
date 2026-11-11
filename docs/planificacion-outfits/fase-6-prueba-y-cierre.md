# Fase 6: prueba real y cierre

Estado: **sin empezar.**
Rama: `docs/planificacion-cierre` (solo documentación). Depende de las fases 0 a 5 en producción.

## Objetivo

Confirmar con cuentas reales que todo funciona, comparar el costo real con el estimado y dejar la documentación al día.

## 1. Prueba real (con Mauri o con quien él diga)

En `www.clossapp.com`, desde un celular, con una cuenta Elite del equipo con push activado:

- [ ] Crear "Mi semana" usando la ubicación y "Fecha importante" sin lugar. Los outfits usan prendas del armario y el clima aparece solo donde hay lugar.
- [ ] Crear un viaje de 10 días a otra ciudad: se arman 7 días, luego 3 más. La maleta lista las prendas sin repetir.
- [ ] "Otro outfit" cambia un momento y la cuota baja 1.
- [ ] Una actividad sin ropa adecuada (por ejemplo "Boda de etiqueta" con un armario casual) muestra el faltante y prendas del Shop, y tocar una la abre en el Shop.
- [ ] A las 21:00 llega "Mañana: …" y, al tocarlo, abre el plan.
- [ ] Al día siguiente, Inicio muestra el outfit planeado y "Me lo puse" suma un uso a esas prendas (revisar en Estadísticas).
- [ ] Llega "Empaca para …" uno o dos días antes del viaje.
- [ ] Con una cuenta Plus: la vista previa, la tarjeta de Inicio, la fila de Perfil y el botón del Simulador llevan a /planes.
- [ ] Solo lectura: cambiar una cuenta de prueba de `elite` a `plus` (con OK de Mauri), revisar que ve sus planes, marca la maleta y no puede crear ni regenerar; regresarla a `elite`.

## 2. Costo real

Después de una semana de uso, correr con el MCP (solo lectura):

```sql
select modelo,
       count(*) as llamadas,
       round(avg(entrada)) as entrada_prom,
       round(avg(salida)) as salida_prom,
       round(avg(cache_lectura)) as cache_prom,
       -- Sonnet 5.5: $2 entrada, $10 salida, $0.20 lectura de caché por millón (USD); 18 MXN por USD
       round(sum(entrada * 2 + salida * 10 + cache_lectura * 0.2 + cache_escritura * 2.5) / 1e6 * 18, 2) as mxn_total
from uso_ia_registro
where ruta = 'planificacion/generar'
group by modelo;
```

Comparar con lo estimado (~$1.2 MXN por bloque de 7 días, ~$0.17 por día). Si sale más del doble, revisar si el caché funciona (`cache_prom` en 0) y si las segundas llamadas de corrección son frecuentes. Anotar el resultado en el README de esta tanda.

## 3. Cosas que hace Mauri (fuera del código)

- [ ] Poner un límite de gasto mensual en la consola de Anthropic.
- [ ] Seguir el "Día del merge" del README (precios nuevos en Stripe y Vercel).
- [ ] Decidir la pendiente P1 (barra inferior) si sigue abierta.

## 4. Documentación

- [ ] `docs/planificacion-outfits/README.md`: estado "en producción", fecha y costo real.
- [ ] `docs/PENDIENTES.md`: marcar la línea de Elite / planificación.
- [ ] `docs/revision-app-2026-11-10.md`: problema 10, anotar que la planificación ya existe (y que "modelos frontier" se cumple con Sonnet 5.5 en la planificación).
- [ ] `docs/tanda-pagos/README.md`: fase 4, apuntar a esta tanda.
- [ ] `docs/modelo-de-negocio.md` (archivo local de Mauri, no está en git): agregar la fila de costo de planificación en "Variables por uso de IA".

## Hecho

(Lo llena quien ejecute la fase.)
