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
  en_venta?: boolean | null
  metadata?: Record<string, string> | null
  created_at: string
}
