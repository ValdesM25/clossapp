export type Prenda = {
  id: string
  user_id: string
  name: string
  category: string
  image_url: string
  talla?: string | null
  estado_uso?: string | null
  precio?: number | null
  precio_renta?: number | null
  en_venta?: boolean | null
  en_renta?: boolean | null
  fecha_renta?: string | null
  metadata?: Record<string, string> | null
  created_at: string
  usos?: number
  ultimo_uso?: string | null
  color?: string | null
  /** Lo que pagó la persona; solo existe si marcó la prenda como compra reciente. */
  compra_precio?: number | null
}

export type PrendaExt = Prenda
