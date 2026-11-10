# Centros de acopio reales

Sale del bug 24 de la revisión del 10 de noviembre de 2026: la tabla `puntos_acopio` no existía en producción y la app mostraba tres centros de ejemplo ("Punto de acopio Centro/Norte/República").

## Decisión de Mauri
- **TecNM ITS Saltillo:** entrada principal, Blvd. Venustiano Carranza 2400, Col. Tecnológico.
- **Alameda Zaragoza:** justo en el centro.
- Los dos en horario de oficina (puse lunes a viernes de 9:00 a 18:00).

## Qué se hizo
- `supabase/20-puntos-acopio.sql`: crea la tabla (lectura pública, sin escritura desde la app) con los dos centros. **Ya aplicado en producción el 10 de noviembre** (migración `puntos_acopio`); como la app ya leía esa tabla, los centros reales aparecen sin esperar el deploy.
- `constants/donaciones.ts`: la lista de respaldo (si la consulta falla) ahora son los dos centros reales. Nuevo `PUNTO_ENTREGA`.
- **Decisión mía:** las compras del marketplace mandaban a recoger a "Centro de Acopio Norte", que no existe (fijo en `escrow-checkout-modal.tsx` y en `escrow.service.ts`). Ahora usan `PUNTO_ENTREGA` (TecNM ITS Saltillo) hasta que se pueda elegir centro.

## Pendiente
- Hay 1 pedido en custodia ya creado con "Centro de Acopio Norte". No se cambió; hay que avisarle a esa persona dónde recoger.

## Cómo se probó
- Consulta con la llave pública, igual que la app: devuelve los dos centros.
- `tsc` sin errores; `eslint` sin avisos nuevos.
