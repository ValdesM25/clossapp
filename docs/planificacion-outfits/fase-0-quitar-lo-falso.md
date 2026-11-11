# Fase 0: quitar lo falso que ya está en producción

Estado: **sin empezar.**
Rama: `fix/quitar-viaje-falso`. No depende de otra fase. Es corta y conviene hacerla primero.

## Objetivo

Hoy cualquier usuario real ve en Inicio un viaje a París que no existe, y en la maqueta un botón "Comprar" que dice "agregado" sin agregar nada. Esta fase quita las dos cosas sin tocar el resto de la maqueta, que se reemplaza en la fase 3.

## Antes de empezar

`git fetch origin` y revisar `git log origin/main -- components/views/planificacion components/views/inicio constants/navigation.ts`. Si klesnuck cambió algo después de `5c04812`, partir de lo último y mencionarlo en el commit.

## Pasos

1. **Inicio** (`components/views/inicio/inicio-view.tsx`): borrar la sección completa que empieza con el comentario `{/* SECCIÓN PLANIFICACIÓN DE VIAJE */}`, hasta su `</section>`. Es la tarjeta "París, a tu manera · 12-16 oct. 2026". Quitar `Luggage` del import de `lucide-react` si ya no se usa en el archivo.
2. **Maqueta** (`components/views/planificacion/planificacion-view.tsx`):
   - Borrar la sección que empieza con `{/* 4. Sección Marketplace: Completa tu maleta, no la llenes */}` hasta su cierre (los dos productos inventados con precio).
   - Borrar la función `handleComprarProducto`, el estado `productoAgregado` y el aviso que lo muestra.
   - Quitar los imports de íconos que queden sin usar (`npx eslint` los marca).
3. **Alias sin uso** (`context/cart-context.tsx`): borrar la última línea, `export const useCart = useCartContext`. Se agregó para que la maqueta compilara y ya nadie la importa. Confirmar con `rg -n "useCart\b" --glob '*.ts*'` que no hay usos.
4. No tocar la barra inferior ni la fila de Perfil: son la pendiente P1 y la fase 4.

## Criterios de aceptación

- [ ] Inicio no muestra ninguna tarjeta de viaje.
- [ ] La maqueta no tiene productos del Shop ni el botón "Comprar".
- [ ] `rg -n "useCart\b" --glob '*.ts*'` no encuentra nada.
- [ ] `npx tsc --noEmit` sin errores; `npx eslint` de los archivos tocados sin errores nuevos.
- [ ] Revisado a 390×844: Inicio se ve bien sin el hueco de la tarjeta.

## Commit sugerido

```
fix: quita el viaje falso de Inicio y los productos inventados de la maqueta

- Inicio mostraba a todos un viaje a París escrito a mano.
- La maqueta de planificación tenía dos productos con precio y un
  "Comprar" que no agregaba nada al carrito.
- Se borra el alias useCart, que ya no usa nadie.
```

## Hecho

(Lo llena quien ejecute la fase.)
