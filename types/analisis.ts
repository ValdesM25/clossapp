/**
 * Tipos del análisis de prendas.
 *
 * Viven aquí y no en el archivo de la ruta a propósito: un componente cliente
 * que importe algo desde `app/api/.../route.ts` arrastra ese módulo entero al
 * bundle del navegador, incluida la instancia del SDK de Anthropic, que lanza
 * al construirse sin API key. Los tipos y constantes compartidos deben salir
 * siempre de módulos neutrales.
 */

export type PrendaAnalysis = {
  nombre: string
  categoria: string
  color_principal: string
  estilo: string
  descripcion: string
}

export type Defecto = {
  descripcion: string
  severidad: "leve" | "moderado" | "notorio"
}

export type Aptitud = {
  apto_venta: boolean
  apto_donacion: boolean
  motivo: string
}

export type PrendaVentaAnalysis = PrendaAnalysis & {
  descripcion_venta: string
  precio_estimado_mxn: { min: number; max: number; sugerido: number }
  defectos: Defecto[]
  etiquetas_originalidad: string[]
  aptitud: Aptitud
}
