# Tanda: pagos con Stripe

Este documento resume qué se va a hacer en esta tanda y por qué, y apunta al detalle de cada fase.
Cada fase vive en su propia rama y en su propio PR. No se hace push ni se abre PR sin el OK de Mauri.

## Por qué existe esta tanda

Hoy los planes no se cobran: el botón "Elegir plan" solo cambia un estado en pantalla y `premium` se activa a mano.
Mauri pidió:

1. Cobrar las suscripciones Plus y Elite con Stripe, siempre fuera de las tiendas de apps: el pago vive en la web (`www.clossapp.com`).
2. Más adelante, cobrar las ventas y rentas del Shop entre usuarias con Stripe, quedándose ClossApp con un 5% de comisión.

Por ahora el mercado es solo México. La app de tiendas, si llega, se hará aparte en Swift y abrirá estas mismas páginas web para pagar.

## Planes (los mismos que publica la landing)

| | Esencial | Plus | Elite |
|---|---|---|---|
| Precio | $0 | $59 MXN al mes | $99 MXN al mes |
| Prendas | hasta 50 | hasta 200 | hasta 500 |
| Análisis IA al subir prenda | 50 de por vida | sin límite | sin límite |
| Outfits con IA | 1 al día | sin límite | sin límite |
| Vender y rentar en el Shop | no (solo donar) | sí | sí |
| Modelos de IA frontier y planificación de outfits | no | no | sí |

- Las cuentas `premium` que existen hoy pasan a `elite` (decidido con Mauri).
- Las suscripciones se pagan solo con tarjeta: Stripe no permite OXXO en cobros recurrentes.
- La landing aclara que los precios y condiciones pueden cambiar sin previo aviso.

## Fases y orden

| Fase | Rama | Qué hace | Detalle |
|---|---|---|---|
| 1 | `feat/suscripciones-stripe` | Planes gratis/plus/elite en la base, pago con Stripe Checkout, portal y webhook, ruta `/planes` | [fase-1-suscripciones.md](fase-1-suscripciones.md) |
| 2 | por definir | Canje de puntos como código de descuento de un solo uso en Stripe | pendiente |
| 3 | por definir | Vender y rentar solo en planes de pago | pendiente |
| 4 | por definir | Funciones exclusivas de Elite: modelos frontier y planificación de outfits | pendiente |
| 5 | por definir | Shop con Stripe Connect y 5% de comisión | pendiente |

La fase 1 va primero porque las demás dependen de saber el plan real de cada cuenta.
