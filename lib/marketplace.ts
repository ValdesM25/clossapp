// Sin imports a propósito: se prueba con `node --test lib/marketplace.test.mjs`.

/** Comisión de Clossapp por cada venta o renta del marketplace (decisión de Mauri). Stripe cobra la suya de aquí. */
export const COMISION_MARKETPLACE = 0.15

export type PagoVendedor = { vendedorId: string; brutoCentavos: number; comisionCentavos: number; netoCentavos: number }

/**
 * Lo que le toca a cada vendedor de una orden, en centavos. La comisión se redondea por vendedor,
 * así neto + comisión siempre suma exacto lo que pagó el comprador por sus prendas.
 */
export function repartoPorVendedor(items: { sellerId: string; precio: number }[], comision = COMISION_MARKETPLACE): PagoVendedor[] {
  const bruto = new Map<string, number>()
  for (const it of items) bruto.set(it.sellerId, (bruto.get(it.sellerId) ?? 0) + Math.round(it.precio * 100))
  return [...bruto].map(([vendedorId, brutoCentavos]) => {
    const comisionCentavos = Math.round(brutoCentavos * comision)
    return { vendedorId, brutoCentavos, comisionCentavos, netoCentavos: brutoCentavos - comisionCentavos }
  })
}
