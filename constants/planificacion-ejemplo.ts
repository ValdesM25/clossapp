import { diasEntre, hoyMexico, sumarDias, type MomentoPlan, type PlanOutfit } from "@/lib/planificacion"
import type { ClimaDia } from "@/lib/clima"

// Plan fijo de la vista previa (sin Elite, demo e invitado). No gasta IA: las prendas son
// las de GUEST_PRENDAS (constants/demo-data.ts), que ya tienen foto.
const hoy = hoyMexico()
const [d1, d2, d3] = diasEntre(hoy, sumarDias(hoy, 2))
const clima = (min: number, max: number, texto: string, lluvia = false): ClimaDia => ({ min, max, texto, lluvia, fuente: "pronostico" })

const momento = (id: string, fecha: string, m: MomentoPlan["momento"], actividad: string, c: ClimaDia, titulo: string,
  descripcion: string, prenda_ids: string[], justificacion?: string, faltante: MomentoPlan["faltante"] = null): MomentoPlan => ({
  id, plan_id: "ejemplo", fecha, momento: m, actividad, clima: c, outfit: { titulo, descripcion, prenda_ids, ...(justificacion ? { justificacion } : {}) },
  faltante, estado: "listo", generado_en: null, usado_en: null,
})

export const PLAN_EJEMPLO: PlanOutfit = {
  id: "ejemplo",
  tipo: "viaje",
  nombre: "Escapada a Oaxaca",
  fecha_inicio: d1,
  fecha_fin: d3,
  lugar: { nombre: "Oaxaca de Juárez, Oaxaca, México", lat: 17.06542, lon: -96.72365 },
  empacadas: ["g1", "g5"],
  created_at: "",
  momentos: [
    momento("e1", d1, "dia", "Llegada y paseo por el centro", clima(13, 26, "Despejado"), "Paseo fresco por el centro",
      "Camisa blanca y jeans: cómodos para caminar y frescos al mediodía.", ["g1", "g2", "g5", "g6"],
      "Las calles del centro son empedradas; los tenis dan buen soporte para caminar horas y la camisa te mantiene fresca con el calor de 26 °C."),
    momento("e2", d1, "noche", "Cena formal", clima(13, 26, "Despejado"), "Cena con vestido y blazer",
      "El vestido floral con el blazer negro encima por si refresca en la noche.", ["g4", "g3", "g5", "g6"],
      "Para una terraza colonial de noche, el vestido aporta elegancia y el blazer te protege cuando baje la temperatura a 13 °C.",
      { categoria: "Calzado", motivo: "Para la cena formal no tienes zapatos de vestir." }),
    momento("e3", d2, "dia", "Visita a Monte Albán", clima(12, 24, "Nublado"), "Ruinas con capas",
      "Blazer sobre la camisa para la mañana fresca y tenis para subir escalones.", ["g1", "g2", "g3", "g5"],
      "Monte Albán exige subir desniveles de tierra y piedra con viento en la cima. Los tenis dan tracción y el blazer te abriga por la mañana."),
    momento("e4", d3, "dia", "Mercado y regreso", clima(14, 25, "Lluvia", true), "Mercado y carretera",
      "Jeans y camisa con el blazer para la lluvia, y el bolso para tus compras.", ["g1", "g2", "g3", "g5", "g6"],
      "Prendas resistentes y cómodas para recorrer puestos y viajar de regreso, con el blazer listo por si sorprende la lluvia."),
  ],
}
