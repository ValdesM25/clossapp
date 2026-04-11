import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
}
