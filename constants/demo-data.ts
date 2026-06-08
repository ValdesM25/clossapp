import type { Prenda, ReparacionDB, OutfitRec } from "@/types"

export const DEMO_OUTFITS: OutfitRec[] = [
  { titulo: "Boho Citadino", descripcion: "Jeans rectos con top de lino y sandalias planas.", prendas_usadas: ["Jeans rectos", "Top de lino", "Sandalias"] },
  { titulo: "Business Chic", descripcion: "Blazer estructurado con pantalón de pinzas y mocasines.", prendas_usadas: ["Blazer", "Pantalón de pinzas", "Mocasines"] },
  { titulo: "Gala Nocturna", descripcion: "Vestido satinado midi con abrigo ligero y tacones.", prendas_usadas: ["Vestido satinado", "Abrigo ligero", "Tacones"] },
]

export const GUEST_PRENDAS: Prenda[] = [
  { id: "g1", user_id: "guest", name: "Camisa Blanca", category: "Tops", image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80", created_at: "" },
  { id: "g2", user_id: "guest", name: "Jeans Azul", category: "Pantalones", image_url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80", created_at: "" },
  { id: "g3", user_id: "guest", name: "Blazer Negro", category: "Chaquetas", image_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80", created_at: "" },
  { id: "g4", user_id: "guest", name: "Vestido Floral", category: "Vestidos", image_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80", created_at: "" },
  { id: "g5", user_id: "guest", name: "Sneakers Blancos", category: "Zapatos", image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80", created_at: "" },
  { id: "g6", user_id: "guest", name: "Bolso Tote", category: "Accesorios", image_url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80", created_at: "" },
]

export const GUEST_REPARACIONES: ReparacionDB[] = [
  { id: "r1", user_id: "guest", prenda_id: null, prenda: "Abrigo beige", tarea: "Cambiar botón", prioridad: "Alta", completado: false, created_at: "" },
  { id: "r2", user_id: "guest", prenda_id: null, prenda: "Pantalón negro", tarea: "Ajustar dobladillo", prioridad: "Media", completado: false, created_at: "" },
]

export const STATIC_MARKET: Prenda[] = [
  { id: "m1", user_id: "market", name: "Bufanda Lino", category: "Accesorios", image_url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80", talla: "Única", estado_uso: "Como nuevo", precio: 80, en_venta: true, created_at: "" },
  { id: "m2", user_id: "market", name: "Zapatillas Blancas", category: "Zapatos", image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80", talla: "38", estado_uso: "Poco uso", precio: 500, en_venta: true, created_at: "" },
  { id: "m3", user_id: "market", name: "Bolso Tote Cuero", category: "Accesorios", image_url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80", talla: "Única", estado_uso: "Como nuevo", precio: 850, en_venta: true, created_at: "" },
  { id: "m4", user_id: "market", name: "Vestido Verano", category: "Ropa", image_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80", talla: "S", estado_uso: "Nuevo con etiqueta", precio: 320, en_venta: true, created_at: "" },
]

export const STATIC_RENTA: Prenda[] = [
  { id: "r1", user_id: "market", name: "Vestido de Noche Satinado", category: "Vestido", image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", talla: "S", estado_uso: "Como nuevo", precio_renta: 350, en_renta: true, created_at: "" },
  { id: "r2", user_id: "market", name: "Bolso Clutch Dorado", category: "Accesorio", image_url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80", talla: "Única", estado_uso: "Como nuevo", precio_renta: 150, en_renta: true, created_at: "" },
  { id: "r3", user_id: "market", name: "Vestido Midi Floral", category: "Vestido", image_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80", talla: "M", estado_uso: "Poco uso", precio_renta: 280, en_renta: true, created_at: "" },
]
