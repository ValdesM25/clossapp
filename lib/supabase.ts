// Type definitions shared across the app.
// The Supabase client instances live in utils/supabase/client.ts (browser)
// and utils/supabase/server.ts (server) to support SSR session cookies.

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
