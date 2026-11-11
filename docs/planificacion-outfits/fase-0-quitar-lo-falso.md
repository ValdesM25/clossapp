# Fase 0: quitar lo falso que ya está en producción

Estado: **hecha el 11 nov 2026, en la rama `fix/quitar-viaje-falso` sin integrar todavía (falta el OK de Mauri).**
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

- [x] Inicio no muestra ninguna tarjeta de viaje.
- [x] La maqueta no tiene productos del Shop ni el botón "Comprar".
- [x] `rg -n "useCart\b" --glob '*.ts*'` no encuentra nada.
- [x] `npx tsc --noEmit` sin errores; `npx eslint` de los archivos tocados sin errores nuevos.
- [x] Revisado a 390×844: Inicio se ve bien sin el hueco de la tarjeta.

## Commit sugerido

```
fix: quita el viaje falso de Inicio y los productos inventados de la maqueta

- Inicio mostraba a todos un viaje a París escrito a mano.
- La maqueta de planificación tenía dos productos con precio y un
  "Comprar" que no agregaba nada al carrito.
- Se borra el alias useCart, que ya no usa nadie.
```

## Hecho

**Punto de partida.** `origin/main` no tenía cambios en `components/views/planificacion`, `components/views/inicio` ni `constants/navigation.ts` después de `5c04812`, y `integracion/elite` ya estaba al día con main. Se partió de `integracion/elite` (`e7e4af6`).

**Qué se cambió:**

| Archivo | Cambio |
|---|---|
| `components/views/inicio/inicio-view.tsx` | Se borró la sección `SECCIÓN PLANIFICACIÓN DE VIAJE` (tarjeta "París, a tu manera") y `Luggage` del import. |
| `components/views/planificacion/planificacion-view.tsx` | Se borró la sección 4 ("Completa tu maleta, no la llenes": bufanda y paraguas con precio), `handleComprarProducto`, el estado `productoAgregado` y su aviso. Se quitaron los íconos que eslint marcaba sin uso: `ShoppingBag` y `CheckCircle2` (por este cambio) y `Cloud`, `Compass` y `SlidersHorizontal` (ya estaban sin uso antes). |
| `context/cart-context.tsx` | Se borró `export const useCart = useCartContext`. |

**Cómo se verificó:**
- `npx tsc --noEmit`: sin errores.
- `npx eslint` de los 3 archivos: 0 errores. Se comparó contra la base: ningún aviso nuevo, y la maqueta bajó de 11 a 4 avisos (se fueron dos `<img>`, los parámetros `_img` y `_precio` y los tres íconos sin uso). Quedan `setTagTemporada` y tres `<img>`, que son de la maqueta y se van en la fase 3.
- `rg -n "useCart\b" --glob '*.ts*'`: sin resultados.
- `next dev` en el worktree y Chromium a 390×844 con la demo de usuario: Inicio pasa de "Outfit del día" a "Prendas olvidadas" sin hueco; la maqueta abre y ya no tiene la sección del Shop.

**Decisiones del agente:**
- El botón de los productos decía "Ver producto", no "Comprar"; era el mismo botón falso (llamaba a `handleComprarProducto`) y se borró con su sección.
- `Cloud`, `Compass` y `SlidersHorizontal` ya estaban importados sin uso antes de esta fase. Se quitaron también, porque el paso 2 pide quitar los íconos que eslint marque.
- No se tocó la barra inferior ni la fila de Perfil (P1 y fase 4).
- Nota para quien siga: Turbopack no arranca con `node_modules` como enlace simbólico ("Symlink node_modules is invalid, it points out of the filesystem root"). Para `next dev` en un worktree funcionó una copia con enlaces duros: `cp -al /home/mauri/Projects/clossapp/node_modules node_modules` (y borrarla antes de commitear). Para `tsc` y `eslint` el enlace simbólico sí sirve.
