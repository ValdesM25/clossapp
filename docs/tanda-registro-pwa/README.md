# Tanda: PWA, registro abierto, onboarding de estilo y armario al día

Este documento resume qué se va a hacer en esta tanda y por qué, y apunta al detalle de cada fase.
Cada fase vive en su propia rama y en su propio PR. No se hace push ni se abre PR sin el OK de Mauri.

## Por qué existe esta tanda

Hoy Mauri crea cada cuenta a mano, y todo usuario con sesión se trata como "Premium VIP".
Mauri pidió:

1. Que cualquiera pueda registrarse solo, con Google, Facebook o correo, de forma segura.
2. Un recorrido al registrarse que pregunte estilo, género, gustos y hábitos de compra, para personalizar los outfits de la IA y sacar estadísticas.
3. Que el armario se mantenga actualizado: subir prendas rápido, recordatorios y puntos por registrar compras recientes.
4. Subir la PWA (app instalable) en esta misma tanda.

## Reglas del plan gratis (decididas con Mauri)

| | Gratis | Premium |
|---|---|---|
| Prendas | hasta 50 a la vez (borrar libera lugar) | sin límite |
| Análisis IA al subir prenda | 50 de por vida | sin límite |
| Outfits / recomendaciones IA | 1 al día | sin límite |
| Modo invitado | se mantiene, sin IA | |

- Las cuentas que ya existen quedan premium.
- Los pagos quedan para una fase siguiente. Mientras tanto, premium se activa a mano.
- Instagram queda fuera del login: Supabase no lo soporta y Meta cerró su login para cuentas personales en diciembre de 2024.

## Fases y orden

| Fase | Rama | Qué hace | Detalle |
|---|---|---|---|
| 0 | `feat/pwa` | App instalable, sesión que no se pierde, pantalla offline | [fase-0-pwa.md](fase-0-pwa.md) |
| 1 | `feat/registro-planes` | Registro abierto, seguridad, plan gratis/premium | [fase-1-registro-planes.md](fase-1-registro-planes.md) |
| 2 | `feat/onboarding-estilo` | Recorrido de estilo y estadísticas de compra, prompt personalizado | [fase-2-onboarding-estilo.md](fase-2-onboarding-estilo.md) |
| 3 | `feat/armario-al-dia` | Compra reciente con puntos, puntos/donaciones seguros, banner y push | [fase-3-armario-al-dia.md](fase-3-armario-al-dia.md) |
| 3b | `feat/modo-demo` | El modo invitado pasa a modo demo (usuario y centro de acopio) con recorrido guiado | [fase-3b-modo-demo.md](fase-3b-modo-demo.md) |
| 4 | `feat/marketplace-escrow` | Marketplace visible desde la base y escrow con su tabla; el precio lo calcula la base | [fase-4-marketplace-escrow.md](fase-4-marketplace-escrow.md) |

La PWA va primero porque toca los mismos archivos de login (`hooks/use-auth.ts`, `services/auth.service.ts`, `middleware.ts`) que la fase 1. Si se hicieran al revés, habría conflictos dos veces.

## Cómo leer los documentos de cada fase

Cada fase explica, por cada cambio:

- **Qué:** archivo o pieza tocada.
- **Cómo:** qué se hizo, en palabras simples.
- **Por qué:** el motivo técnico.
- **Decisión:** si fue decisión de Mauri o una decisión mía (marcada como tal para que se pueda revisar).
