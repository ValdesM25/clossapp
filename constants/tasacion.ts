/**
 * Ejes de captura para tasar una prenda.
 *
 * Son obligatorios: sin ver la prenda por los cuatro lados el modelo no puede
 * detectar desperfectos con criterio, y una tasación a ciegas es peor que no
 * tasar. Las fotos extra son opcionales y sirven para acercamientos.
 */
export type EjeCaptura = {
  id: string
  label: string
  ayuda: string
}

export const EJES_CAPTURA: EjeCaptura[] = [
  { id: "frente", label: "Frente", ayuda: "Prenda completa, de frente y extendida" },
  { id: "espalda", label: "Espalda", ayuda: "Prenda completa, por detrás" },
  { id: "lateral", label: "Lateral", ayuda: "De costado, para ver caída y volumen" },
  { id: "etiqueta", label: "Etiqueta", ayuda: "Marca, talla y composición" },
]

export const MIN_FOTOS = EJES_CAPTURA.length

/** Máximo de fotos que se envían al modelo en una sola llamada. */
export const MAX_IMAGENES = 10

/** Mínimo para tasar: frente, espalda, lateral y etiqueta. */
export const MIN_IMAGENES = MIN_FOTOS
