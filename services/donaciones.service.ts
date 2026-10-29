import type { SupabaseClient } from "@supabase/supabase-js"
import type { DonacionTicket, AcopioRegistroDB, PuntoAcopioDB } from "@/types/donaciones"
import { PUNTOS_ACOPIO } from "@/constants/donaciones"

/** Puntos con los que arranca toda cuenta (la base usa el mismo número en mis_puntos). */
export const PUNTOS_BASE = 150

/**
 * Obtiene la lista de Puntos de Acopio registrados en la BD.
 */
export async function fetchPuntosAcopio(supabase: SupabaseClient): Promise<PuntoAcopioDB[]> {
  try {
    const { data, error } = await supabase
      .from("puntos_acopio")
      .select("*")
      .eq("activo", true)
      .order("nombre")

    if (error || !data || data.length === 0) {
      return PUNTOS_ACOPIO.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        zona: p.zona,
        horario: p.horario,
        activo: true,
      }))
    }
    return data
  } catch (err) {
    console.warn("fetchPuntosAcopio fallback to default:", err)
    return PUNTOS_ACOPIO.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      zona: p.zona,
      horario: p.horario,
      activo: true,
    }))
  }
}

/**
 * Obtiene los tickets de donación para un usuario o todos si es verificador.
 */
export async function fetchUserTickets(
  supabase: SupabaseClient,
  userId?: string
): Promise<DonacionTicket[]> {
  let dbTickets: DonacionTicket[] = []
  try {
    let query = supabase.from("donacion_tickets").select("*").order("created_at", { ascending: false })
    
    // Si no es verificador/recolección y hay un userId específico, traer los tickets del usuario o tickets generales/invitado
    if (userId && userId !== "guest" && userId !== "punto_centro_norte") {
      query = query.or(`user_id.eq.${userId},user_id.is.null`)
    }

    const { data, error } = await query
    if (!error && data) {
      dbTickets = data.map((t) => ({
        id: t.id,
        qrToken: t.qr_token,
        userId: t.user_id || "guest",
        donorName: t.donor_name || "Donante ClossApp",
        donorEmail: t.donor_email || "",
        puntoAcopioId: t.punto_acopio_id,
        puntoAcopioNombre: t.punto_acopio_nombre,
        status: t.status,
        prendas: Array.isArray(t.prendas_ids) ? t.prendas_ids : [],
        cantidadPrendas: t.cantidad_prendas,
        puntosOtorgados: t.puntos_otorgados || 0,
        createdAt: t.created_at,
        validatedAt: t.validated_at,
        validatedBy: t.validated_by,
      }))
    }
  } catch (err) {
    console.error("fetchUserTickets error:", err)
  }

  // Combinar con tickets guardados localmente en localStorage
  let localTickets: DonacionTicket[] = []
  if (typeof window !== "undefined") {
    try {
      const localStr = localStorage.getItem("clossapp_local_tickets_v1")
      if (localStr) {
        localTickets = JSON.parse(localStr)
      }
    } catch {}
  }

  // Fusionar tickets evitando duplicados (priorizando estado "completado" y datos de la BD)
  const map = new Map<string, DonacionTicket>()
  localTickets.forEach((t) => map.set(t.qrToken || t.id, t))
  dbTickets.forEach((t) => {
    const existing = map.get(t.qrToken || t.id)
    if (!existing || t.status === "completado") {
      map.set(t.qrToken || t.id, t)
    } else {
      map.set(t.qrToken || t.id, { ...existing, ...t })
    }
  })

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )
}

/**
 * Saldo de puntos de la usuaria con sesión: 150 de base + movimientos de
 * puntos_historial. Lo calcula la base (mis_puntos); el navegador ya no
 * suma ni guarda puntos por su cuenta.
 */
export async function fetchUserPuntos(supabase: SupabaseClient, userId?: string): Promise<number> {
  if (!userId || userId === "guest") return PUNTOS_BASE
  const { data, error } = await supabase.rpc("mis_puntos")
  if (error) {
    console.warn("fetchUserPuntos:", error.message)
    return PUNTOS_BASE
  }
  return typeof data === "number" ? data : PUNTOS_BASE
}

/** Prendas donadas en total (público, sin datos personales). */
export async function fetchAcopioImpacto(
  supabase: SupabaseClient
): Promise<{ prendasDonadas: number; familiasApoyadas: number }> {
  const { data, error } = await supabase.rpc("impacto_donaciones")
  if (error) {
    console.error("fetchAcopioImpacto:", error.message)
    return { prendasDonadas: 0, familiasApoyadas: 0 }
  }
  const prendasDonadas = Number(data) || 0
  return { prendasDonadas, familiasApoyadas: Math.ceil(prendasDonadas / 4) }
}

/**
 * Crea un nuevo ticket de donación con token QR en Supabase.
 */
export async function createDonacionTicket(
  supabase: SupabaseClient,
  ticket: {
    userId: string
    donorName?: string
    donorEmail?: string
    puntoAcopioId: string
    puntoAcopioNombre: string
    cantidadPrendas: number
    prendas: any[]
    puntosEstimados: number
  }
): Promise<DonacionTicket> {
  const token = `TKT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
  const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  const fallbackTicket: DonacionTicket = {
    id: ticketId,
    qrToken: token,
    userId: ticket.userId,
    donorName: ticket.donorName || "Donante ClossApp",
    donorEmail: ticket.donorEmail || "donante@clossapp.com",
    puntoAcopioId: ticket.puntoAcopioId,
    puntoAcopioNombre: ticket.puntoAcopioNombre,
    status: "pendiente",
    prendas: ticket.prendas,
    cantidadPrendas: ticket.cantidadPrendas,
    puntosOtorgados: ticket.puntosEstimados,
    createdAt: new Date().toISOString(),
  }

  const finalTicket: DonacionTicket = {
    ...fallbackTicket,
  }

  try {
    const validUserId =
      ticket.userId && ticket.userId !== "guest" && ticket.userId.includes("-")
        ? ticket.userId
        : null

    const payload = {
      user_id: validUserId,
      donor_name: ticket.donorName || "Donante ClossApp",
      donor_email: ticket.donorEmail || "",
      punto_acopio_id: ticket.puntoAcopioId,
      punto_acopio_nombre: ticket.puntoAcopioNombre,
      status: "pendiente",
      cantidad_prendas: ticket.cantidadPrendas,
      prendas_ids: ticket.prendas,
      puntos_otorgados: ticket.puntosEstimados,
      qr_token: token,
    }

    const { data, error } = await supabase
      .from("donacion_tickets")
      .insert(payload)
      .select("*")
      .single()

    if (!error && data) {
      finalTicket.id = data.id
      finalTicket.qrToken = data.qr_token
      finalTicket.createdAt = data.created_at
    } else if (error) {
      console.warn("createDonacionTicket DB notice (using generated local ticket):", error.message || error)
    }
  } catch (err) {
    console.warn("createDonacionTicket error (using generated local ticket):", err)
  }

  // Guardar siempre en localStorage para persistencia y disponibilidad local
  if (typeof window !== "undefined") {
    try {
      const localStr = localStorage.getItem("clossapp_local_tickets_v1")
      const list: DonacionTicket[] = localStr ? JSON.parse(localStr) : []
      // Reemplazar si ya existe por QR token o agregar al inicio
      const filtered = list.filter((t) => t.qrToken !== finalTicket.qrToken && t.id !== finalTicket.id)
      filtered.unshift(finalTicket)
      localStorage.setItem("clossapp_local_tickets_v1", JSON.stringify(filtered))
    } catch {}
  }

  return finalTicket
}

/** Texto legible de un error de las funciones de la base ("CODIGO: mensaje"). */
function mensajeRpc(message: string | undefined, fallback: string): string {
  const texto = (message ?? "").split(": ").slice(1).join(": ").trim()
  return texto || fallback
}

/**
 * Verifica el QR en el punto de recolección. Todo lo decide la base
 * (validar_donacion_qr): que quien escanea sea una cuenta de acopio, que el
 * ticket exista y esté pendiente, y cuántos puntos corresponden.
 * Soporta el token directo ("TKT-...") o el JSON que lleva el QR.
 * `_centroId` y `_centroNombre` quedan por compatibilidad: el centro sale del perfil de acopio.
 */
export async function validarTicketQR(
  supabase: SupabaseClient,
  qrInput: string,
  _centroId?: string,
  _centroNombre?: string,
  cantidadRecibida?: number
): Promise<{
  success: boolean
  puntos: number
  donorName: string
  donorEmail?: string
  cantidadPrendas: number
  prendas: any[]
  prendasResumen: string
  registroId?: string
}> {
  let token = qrInput.trim()
  if (token.startsWith("{") && token.endsWith("}")) {
    try {
      const parsed = JSON.parse(token)
      token = parsed.tkt || parsed.token || parsed.esc || parsed.qrToken || token
    } catch {}
  }

  if (token.toUpperCase().startsWith("ESC-")) {
    throw new Error("Este código QR pertenece a una Entrega de Compra en Custodia (Marketplace), no a un ticket de donación. Por favor usa la pestaña 'Entregas de Compras y Renta'.")
  }

  const { data, error } = await supabase.rpc("validar_donacion_qr", {
    p_token: token,
    p_cantidad: cantidadRecibida ?? null,
  })
  if (error || !data) {
    throw new Error(mensajeRpc(error?.message, "No se pudo validar la donación. Intenta de nuevo."))
  }

  const prendas: any[] = Array.isArray(data.prendas) ? data.prendas : []
  const nombres = prendas
    .map((p: any) => (typeof p === "string" ? p : p?.name || p?.categoria))
    .filter(Boolean)
  const cantidad = Number(data.cantidad) || prendas.length || 1

  return {
    success: true,
    puntos: Number(data.puntos) || 0,
    donorName: data.donor_name || "Donante ClossApp",
    donorEmail: data.donor_email || "",
    cantidadPrendas: cantidad,
    prendas,
    prendasResumen: nombres.length ? nombres.join(", ") : `${cantidad} prendas registradas`,
    registroId: data.registro_id ?? undefined,
  }
}

/**
 * Obtiene la bitácora completa de registros guardados en la tabla `acopio_registros` combinada con los locales.
 */
export async function fetchAcopioRegistros(
  supabase: SupabaseClient
): Promise<AcopioRegistroDB[]> {
  let dbRegs: AcopioRegistroDB[] = []
  try {
    const { data } = await supabase
      .from("acopio_registros")
      .select("*")
      .order("fecha_registro", { ascending: false })

    if (data) dbRegs = data
  } catch (err) {
    console.error("fetchAcopioRegistros DB error:", err)
  }

  let localRegs: AcopioRegistroDB[] = []
  if (typeof window !== "undefined") {
    try {
      const localStr = localStorage.getItem("clossapp_local_acopio_registros_v1")
      if (localStr) {
        localRegs = JSON.parse(localStr)
      }
    } catch {}
  }

  // Fusionar evitando duplicados por id
  const map = new Map<string, AcopioRegistroDB>()
  localRegs.forEach((r) => map.set(r.id, r))
  dbRegs.forEach((r) => map.set(r.id, r))

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime()
  )
}

/**
 * Registra una donación presencial directamente en la tabla bitácora `acopio_registros`.
 */
export async function registrarDonacionPresencial(
  supabase: SupabaseClient,
  input: {
    puntoAcopioId: string
    puntoAcopioNombre: string
    donorName: string
    cantidadPrendas: number
    puntos: number
    categoria: string
  }
): Promise<AcopioRegistroDB | null> {
  try {
    const { data, error } = await supabase
      .from("acopio_registros")
      .insert({
        punto_acopio_id: input.puntoAcopioId,
        punto_acopio_nombre: input.puntoAcopioNombre,
        donor_name: input.donorName,
        cantidad_prendas: input.cantidadPrendas,
        puntos_otorgados: input.puntos,
        fecha_registro: new Date().toISOString(),
        observaciones: `Registro presencial - Categoría: ${input.categoria}`,
      })
      .select("*")
      .single()

    if (error || !data) {
      console.error("registrarDonacionPresencial error:", error)
      return null
    }

    return data
  } catch (err) {
    console.error("registrarDonacionPresencial exception:", err)
    return null
  }
}

export interface DonanteRegistrado {
  id: string
  nombre: string
  email: string
  prendas: Array<{
    id: string
    name: string
    category: string
    image_url: string
    usos?: number
    ultimo_uso?: string
    talla?: string
    estado_uso?: string
  }>
}

export const DONANTES_DEMO: DonanteRegistrado[] = [
  {
    id: "d_mariela",
    nombre: "Mariela Morales",
    email: "mariela@clossapp.com",
    prendas: [
      { id: "m1", name: "Jeans Skinny Azul Denim Levi's", category: "Pantalones", image_url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=80", usos: 45, talla: "M", estado_uso: "Excelente" },
      { id: "m2", name: "Blazer Negro Elegante", category: "Abrigos e Invierno", image_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80", usos: 32, talla: "S", estado_uso: "Como nuevo" },
      { id: "m3", name: "Top de Lino Blanco", category: "Tops", image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80", usos: 28, talla: "S", estado_uso: "Bueno" },
      { id: "m4", name: "Vestido Midi Satinado", category: "Vestidos", image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", usos: 14, talla: "M", estado_uso: "Como nuevo" },
      { id: "m5", name: "Abrigo Beige de Lana", category: "Abrigos e Invierno", image_url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80", usos: 8, talla: "M", estado_uso: "Poco uso" },
      { id: "m6", name: "Sandalias de Cuero", category: "Calzado y Zapatos", image_url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80", usos: 5, talla: "24", estado_uso: "Bueno" }
    ]
  },
  {
    id: "d_gabriel",
    nombre: "Gabriel Morales",
    email: "gabriel@clossapp.com",
    prendas: [
      { id: "g1", name: "Chamarra de Mezclilla Azul", category: "Abrigos e Invierno", image_url: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&q=80", usos: 38, talla: "L", estado_uso: "Excelente" },
      { id: "g2", name: "Camisa Casual Oxford", category: "Tops", image_url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&q=80", usos: 29, talla: "L", estado_uso: "Bueno" },
      { id: "g3", name: "Pants Deportivos Negros", category: "Ropa Casual / Pantalones", image_url: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&q=80", usos: 21, talla: "L", estado_uso: "Bueno" },
      { id: "g4", name: "Sudadera Gris Oversize", category: "Abrigos e Invierno", image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&q=80", usos: 12, talla: "XL", estado_uso: "Como nuevo" },
      { id: "g5", name: "Tenis Blancos de Cuero", category: "Calzado y Zapatos", image_url: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&q=80", usos: 7, talla: "28", estado_uso: "Poco uso" }
    ]
  },
  {
    id: "d_sofia",
    nombre: "Sofía Rodríguez",
    email: "sofia@clossapp.com",
    prendas: [
      { id: "s1", name: "Vestido Floral Verano", category: "Vestidos", image_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80", usos: 41, talla: "S", estado_uso: "Excelente" },
      { id: "s2", name: "Chamarra de Piel Sintética", category: "Abrigos e Invierno", image_url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80", usos: 30, talla: "S", estado_uso: "Como nuevo" },
      { id: "s3", name: "Falda Plisada Negra", category: "Ropa Casual / Pantalones", image_url: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&q=80", usos: 24, talla: "M", estado_uso: "Bueno" },
      { id: "s4", name: "Blusa de Seda Rosa", category: "Tops", image_url: "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&q=80", usos: 15, talla: "S", estado_uso: "Bueno" },
      { id: "s5", name: "Zapatillas Altas Beige", category: "Calzado y Zapatos", image_url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80", usos: 9, talla: "23.5", estado_uso: "Poco uso" }
    ]
  },
  {
    id: "d_ana",
    nombre: "Ana Gómez",
    email: "ana@clossapp.com",
    prendas: [
      { id: "a1", name: "Blazer Beige Estructurado", category: "Abrigos e Invierno", image_url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80", usos: 36, talla: "M", estado_uso: "Excelente" },
      { id: "a2", name: "Pantalón de Vestir Marino", category: "Ropa Casual / Pantalones", image_url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80", usos: 27, talla: "M", estado_uso: "Bueno" },
      { id: "a3", name: "Suéter Tejido Crema", category: "Abrigos e Invierno", image_url: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&q=80", usos: 18, talla: "M", estado_uso: "Como nuevo" },
      { id: "a4", name: "Botines de Cuero Marrón", category: "Calzado y Zapatos", image_url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80", usos: 11, talla: "24.5", estado_uso: "Bueno" }
    ]
  }
]

export async function fetchDonantesRegistrados(supabase: SupabaseClient): Promise<DonanteRegistrado[]> {
  try {
    const { data: dbPrendas } = await supabase.from("prendas").select("*")
    if (dbPrendas && dbPrendas.length > 0) {
      // Aggregate real DB prendas by user
      const usersMap = new Map<string, DonanteRegistrado>()
      dbPrendas.forEach((p) => {
        const uId = p.user_id || "guest"
        if (!usersMap.has(uId)) {
          const defaultName = uId === "guest" ? "Donante Invitado" : `Usuario ${uId.substring(0, 6)}`
          usersMap.set(uId, {
            id: uId,
            nombre: defaultName,
            email: `${uId}@clossapp.com`,
            prendas: []
          })
        }
        usersMap.get(uId)!.prendas.push({
          id: p.id,
          name: p.name,
          category: p.category,
          image_url: p.image_url,
          usos: p.usos || 0,
          ultimo_uso: p.ultimo_uso,
          talla: p.talla,
          estado_uso: p.estado_uso
        })
      })

      const realDonors = Array.from(usersMap.values())
      // Merge with demo donors so there are full rich profiles available
      const merged = [...realDonors]
      DONANTES_DEMO.forEach((d) => {
        if (!merged.some((m) => m.nombre.toLowerCase() === d.nombre.toLowerCase())) {
          merged.push(d)
        }
      })
      return merged
    }
  } catch (err) {
    console.warn("fetchDonantesRegistrados fallback:", err)
  }
  return DONANTES_DEMO
}


