import type { SupabaseClient } from "@supabase/supabase-js"
import type { DonacionTicket, AcopioRegistroDB, PuntoAcopioDB } from "@/types/donaciones"
import { PUNTOS_ACOPIO } from "@/constants/donaciones"

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
  try {
    let query = supabase.from("donacion_tickets").select("*").order("created_at", { ascending: false })
    if (userId && userId !== "guest") {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query
    if (error || !data) return []

    return data.map((t) => ({
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
  } catch (err) {
    console.error("fetchUserTickets error:", err)
    return []
  }
}

/**
 * Calcula el saldo total de puntos de un usuario desde la BD y/or registros de acopio / localStorage.
 */
export async function fetchUserPuntos(
  supabase: SupabaseClient,
  userId?: string,
  donorName?: string,
  donorEmail?: string
): Promise<number> {
  let totalPuntos = 0

  // 1. Intentar consultar la tabla `puntos_historial`
  if (userId && userId !== "guest") {
    try {
      const { data, error } = await supabase
        .from("puntos_historial")
        .select("puntos")
        .eq("user_id", userId)

      if (!error && data && data.length > 0) {
        totalPuntos += data.reduce((acc, row) => acc + (row.puntos || 0), 0)
      }
    } catch (err) {
      console.warn("fetchUserPuntos DB error:", err)
    }
  }

  // 2. Sumar también donaciones registradas en `acopio_registros` para este donante
  try {
    let query = supabase.from("acopio_registros").select("puntos_otorgados, donor_user_id, donor_email, donor_name")
    if (userId && userId !== "guest") {
      query = query.or(`donor_user_id.eq.${userId}${donorEmail ? `,donor_email.eq.${donorEmail}` : ""}`)
    } else if (donorEmail) {
      query = query.eq("donor_email", donorEmail)
    } else if (donorName) {
      query = query.eq("donor_name", donorName)
    }

    const { data } = await query
    if (data && data.length > 0) {
      const acopioPts = data.reduce((acc, row) => acc + (row.puntos_otorgados || 0), 0)
      if (acopioPts > totalPuntos) {
        totalPuntos = acopioPts
      }
    }
  } catch (err) {
    console.warn("fetchUserPuntos acopio_registros error:", err)
  }

  // 3. Sincronizar con localStorage en el navegador si existe saldo guardado
  if (typeof window !== "undefined") {
    try {
      const localStr = localStorage.getItem("clossapp_user_puntos_v1")
      if (localStr) {
        const localPts = parseInt(localStr, 10)
        if (!isNaN(localPts) && localPts > totalPuntos) {
          totalPuntos = localPts
        }
      }
      const finalTotal = Math.max(totalPuntos, 150)
      localStorage.setItem("clossapp_user_puntos_v1", finalTotal.toString())
      return finalTotal
    } catch {}
  }

  return Math.max(totalPuntos, 150)
}

/**
 * Calcula el impacto acumulado de donaciones desde la BD.
 */
export async function fetchAcopioImpacto(
  supabase: SupabaseClient
): Promise<{ prendasDonadas: number; familiasApoyadas: number }> {
  try {
    const { data, error } = await supabase
      .from("acopio_registros")
      .select("cantidad_prendas")

    if (error || !data) return { prendasDonadas: 0, familiasApoyadas: 0 }

    const prendasDonadas = data.reduce((sum, r) => sum + (r.cantidad_prendas || 0), 0)
    const familiasApoyadas = Math.ceil(prendasDonadas / 4)
    return { prendasDonadas, familiasApoyadas }
  } catch (err) {
    console.error("fetchAcopioImpacto error:", err)
    return { prendasDonadas: 0, familiasApoyadas: 0 }
  }
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
      return {
        ...fallbackTicket,
        id: data.id,
        qrToken: data.qr_token,
        createdAt: data.created_at,
      }
    } else if (error) {
      console.warn("createDonacionTicket DB notice (using generated local ticket):", error.message || error)
    }
  } catch (err) {
    console.warn("createDonacionTicket error (using generated local ticket):", err)
  }

  return fallbackTicket
}

/**
 * Ejecuta la verificación del QR en el Centro de Acopio y registra en la tabla bitácora `acopio_registros`.
 * Soporta escaneo de token directo ("TKT-...") o de objeto JSON serializado.
 */
export async function validarTicketQR(
  supabase: SupabaseClient,
  qrInput: string,
  centroId: string,
  centroNombre?: string
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
  try {
    let tokenToSearch = qrInput.trim()
    let ticketIdFromJSON: string | undefined
    let parsedJSON: any = null

    if (qrInput.startsWith("{") && qrInput.endsWith("}")) {
      try {
        parsedJSON = JSON.parse(qrInput)
        if (parsedJSON.tkt) tokenToSearch = parsedJSON.tkt
        else if (parsedJSON.qrToken) tokenToSearch = parsedJSON.qrToken

        if (parsedJSON.id) ticketIdFromJSON = parsedJSON.id
        else if (parsedJSON.ticketId) ticketIdFromJSON = parsedJSON.ticketId
      } catch {}
    }

    // Buscar ticket por token o id en la tabla donacion_tickets
    let query = supabase.from("donacion_tickets").select("*")
    if (ticketIdFromJSON) {
      query = query.or(`qr_token.eq.${tokenToSearch},id.eq.${ticketIdFromJSON}`)
    } else {
      query = query.eq("qr_token", tokenToSearch)
    }

    const { data: ticket, error: ticketErr } = await query.maybeSingle()

    if (ticketErr || !ticket) {
      // Si no existe aún en la BD por ser un QR generado de prueba o invitado
      const fallbackDonor = parsedJSON?.donorName || parsedJSON?.name || "Donante Verificado"
      const fallbackEmail = parsedJSON?.donorEmail || ""
      const fallbackPrendas = Array.isArray(parsedJSON?.prendas) ? parsedJSON.prendas : []
      const fallbackCount = parsedJSON?.cantidadPrendas || parsedJSON?.cant || (fallbackPrendas.length > 0 ? fallbackPrendas.length : 3)
      const fallbackPuntos = parsedJSON?.puntos || parsedJSON?.pts || (fallbackCount >= 3 ? 100 + (fallbackCount - 3) * 20 : 50)
      
      const nombresList = fallbackPrendas
        .map((p: any) => p.name || p.categoria || "Prenda")
        .filter(Boolean)
      const fallbackResumen = nombresList.length > 0 ? nombresList.join(", ") : `${fallbackCount} prendas entregadas`
      
      const cNombre = centroNombre || "Centro de Acopio Norte"

      const { data: regData } = await supabase
        .from("acopio_registros")
        .insert({
          punto_acopio_id: centroId,
          punto_acopio_nombre: cNombre,
          donor_name: fallbackDonor,
          donor_email: fallbackEmail,
          cantidad_prendas: fallbackCount,
          puntos_otorgados: fallbackPuntos,
          fecha_registro: new Date().toISOString(),
          observaciones: `Verificación QR (${tokenToSearch}) — Donante: ${fallbackDonor} — ${fallbackResumen}`,
        })
        .select("id")
        .single()

      // Sincronizar en localStorage y notificar a la app de la actualización de puntos
      if (typeof window !== "undefined") {
        try {
          const currentStr = localStorage.getItem("clossapp_user_puntos_v1")
          const current = currentStr ? parseInt(currentStr, 10) : 150
          const newTotal = current + fallbackPuntos
          localStorage.setItem("clossapp_user_puntos_v1", newTotal.toString())
          window.dispatchEvent(new CustomEvent("clossapp_puntos_updated", { detail: { puntos: newTotal } }))
          window.dispatchEvent(new Event("storage"))
        } catch {}
      }

      return {
        success: true,
        puntos: fallbackPuntos,
        donorName: fallbackDonor,
        donorEmail: fallbackEmail,
        cantidadPrendas: fallbackCount,
        prendas: fallbackPrendas,
        prendasResumen: fallbackResumen,
        registroId: regData?.id,
      }
    }

    const cNombre = centroNombre || ticket.punto_acopio_nombre || "Centro de Acopio Norte"
    const donorName = ticket.donor_name || parsedJSON?.donorName || "Donante ClossApp"
    const donorEmail = ticket.donor_email || parsedJSON?.donorEmail || ""
    const prendas = Array.isArray(ticket.prendas_ids) && ticket.prendas_ids.length > 0 
      ? ticket.prendas_ids 
      : (Array.isArray(parsedJSON?.prendas) ? parsedJSON.prendas : [])
    
    const count = ticket.cantidad_prendas || parsedJSON?.cantidadPrendas || (prendas.length > 0 ? prendas.length : 1)
    const puntos = ticket.puntos_otorgados || parsedJSON?.puntos || (count >= 3 ? 100 + (count - 3) * 20 : 50)

    let prendasResumen = `${count} prendas registradas`
    if (prendas.length > 0) {
      const nombresPrendas = prendas
        .map((p: any) => (typeof p === "string" ? p : p.name || p.categoria || "Prenda"))
        .filter(Boolean)
      if (nombresPrendas.length > 0) {
        prendasResumen = nombresPrendas.join(", ")
      }
    }

    // Actualizar estado si estaba pendiente
    if (ticket.status !== "completado") {
      await supabase
        .from("donacion_tickets")
        .update({
          status: "completado",
          validated_at: new Date().toISOString(),
          validated_by: centroId,
        })
        .eq("id", ticket.id)

      // Insertar registro en bitácora acopio_registros
      const { data: regData } = await supabase
        .from("acopio_registros")
        .insert({
          ticket_id: ticket.id,
          punto_acopio_id: centroId,
          punto_acopio_nombre: cNombre,
          donor_user_id: ticket.user_id,
          donor_name: donorName,
          donor_email: donorEmail,
          cantidad_prendas: count,
          puntos_otorgados: puntos,
          fecha_registro: new Date().toISOString(),
          observaciones: `Donación entregada por ${donorName}: ${prendasResumen}`,
        })
        .select("id")
        .single()

      // Acreditar puntos en puntos_historial si hay usuario registrado
      if (ticket.user_id && ticket.user_id !== "guest" && puntos > 0) {
        await supabase.from("puntos_historial").insert({
          user_id: ticket.user_id,
          puntos: puntos,
          tipo: "donacion",
          referencia_id: ticket.id,
          descripcion: `Donación de ${count} prendas verificada en ${cNombre}`,
        })
      }

      // Actualizar estado de las prendas en la BD si existen IDs
      if (prendas.length > 0) {
        const prendaIds = prendas.map((p: any) => typeof p === "string" ? p : p.id).filter(Boolean)
        if (prendaIds.length > 0) {
          await supabase
            .from("prendas")
            .update({
              estado_uso: "Donada",
              metadata: { donada: true, fecha_donacion: new Date().toISOString() }
            })
            .in("id", prendaIds)
        }
      }

      // Sincronizar en localStorage y notificar a la app de la actualización de puntos
      if (typeof window !== "undefined") {
        try {
          const currentStr = localStorage.getItem("clossapp_user_puntos_v1")
          const current = currentStr ? parseInt(currentStr, 10) : 150
          const newTotal = current + puntos
          localStorage.setItem("clossapp_user_puntos_v1", newTotal.toString())
          window.dispatchEvent(new CustomEvent("clossapp_puntos_updated", { detail: { puntos: newTotal } }))
          window.dispatchEvent(new Event("storage"))
        } catch {}
      }

      return {
        success: true,
        puntos,
        donorName,
        donorEmail,
        cantidadPrendas: count,
        prendas,
        prendasResumen,
        registroId: regData?.id,
      }
    }

    return {
      success: true,
      puntos,
      donorName,
      donorEmail,
      cantidadPrendas: count,
      prendas,
      prendasResumen: `${prendasResumen} (Previamente verificado)`,
    }
  } catch (err) {
    console.error("validarTicketQR error:", err)
    throw err
  }
}

/**
 * Obtiene la bitácora completa de registros guardados en la tabla `acopio_registros`.
 */
export async function fetchAcopioRegistros(
  supabase: SupabaseClient
): Promise<AcopioRegistroDB[]> {
  try {
    const { data, error } = await supabase
      .from("acopio_registros")
      .select("*")
      .order("fecha_registro", { ascending: false })

    if (error || !data) return []
    return data
  } catch (err) {
    console.error("fetchAcopioRegistros error:", err)
    return []
  }
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


