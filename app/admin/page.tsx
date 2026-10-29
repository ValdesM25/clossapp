"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, ShieldAlert, Check, X, Phone, Mail, MapPin, Clock, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import type { EstadoSolicitud, SolicitudDB } from "@/lib/solicitudes"

const PESTANAS: { id: EstadoSolicitud; label: string }[] = [
  { id: "pendiente", label: "Pendientes" },
  { id: "aprobada", label: "Aprobadas" },
  { id: "rechazada", label: "Rechazadas" },
]

/** Panel de administración: revisar solicitudes de centros de acopio. Solo cuentas con es_admin. */
export default function AdminPage() {
  const supabase = useMemo(() => createClient(), [])
  const [acceso, setAcceso] = useState<"cargando" | "si" | "no">("cargando")
  const [solicitudes, setSolicitudes] = useState<SolicitudDB[]>([])
  const [correos, setCorreos] = useState<Record<string, string>>({})
  const [pestana, setPestana] = useState<EstadoSolicitud>("pendiente")

  const cargar = useCallback(async () => {
    const [{ data: lista }, { data: mails }] = await Promise.all([
      supabase.from("solicitudes_acopio").select("*").order("created_at", { ascending: false }),
      supabase.rpc("solicitudes_con_correo"),
    ])
    setSolicitudes((lista ?? []) as SolicitudDB[])
    setCorreos(Object.fromEntries(((mails ?? []) as { id: string; correo: string }[]).map((m) => [m.id, m.correo])))
  }, [supabase])

  useEffect(() => {
    ;(async () => {
      // La base decide quién es admin; esta pantalla solo lo pregunta.
      const { data } = await supabase.rpc("es_admin")
      if (data !== true) return setAcceso("no")
      setAcceso("si")
      await cargar()
    })()
  }, [supabase, cargar])

  if (acceso === "cargando") {
    return <div className="min-h-dvh flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
  }
  if (acceso === "no") {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="w-6 h-6 text-zinc-900" aria-hidden="true" />
        <p className="text-sm text-zinc-700">Esta sección es solo para administración de Clossapp.</p>
        <Link href="/" className="text-sm underline underline-offset-2">Volver a Clossapp</Link>
      </main>
    )
  }

  const visibles = solicitudes.filter((s) => s.estado === pestana)
  const conteo = (e: EstadoSolicitud) => solicitudes.filter((s) => s.estado === e).length

  return (
    <main className="min-h-dvh bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Administración</p>
            <h1 className="font-serif text-2xl text-zinc-900">Solicitudes de centros de acopio</h1>
          </div>
          <Link href="/" className="text-xs underline underline-offset-2 text-zinc-600">Volver a la app</Link>
        </div>
        <nav className="max-w-4xl mx-auto px-4 flex gap-1" aria-label="Estado de las solicitudes">
          {PESTANAS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPestana(p.id)} aria-pressed={pestana === p.id}
              className={cn("px-4 py-2.5 text-xs tracking-wide border-b-2 -mb-px",
                pestana === p.id ? "border-zinc-900 text-zinc-900 font-medium" : "border-transparent text-zinc-500 hover:text-zinc-900")}>
              {p.label} <span className="tabular-nums text-zinc-400">({conteo(p.id)})</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
        {visibles.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-12">No hay solicitudes {PESTANAS.find((p) => p.id === pestana)?.label.toLowerCase()}.</p>
        )}
        {visibles.map((s) => (
          <TarjetaSolicitud key={s.id} solicitud={s} correo={correos[s.id]} onRevisada={cargar} />
        ))}
      </div>
    </main>
  )
}

function TarjetaSolicitud({ solicitud: s, correo, onRevisada }: { solicitud: SolicitudDB; correo?: string; onRevisada: () => Promise<void> }) {
  const supabase = useMemo(() => createClient(), [])
  const [nota, setNota] = useState("")
  // Paso de confirmación en la misma tarjeta (sin diálogos del navegador).
  const [confirmando, setConfirmando] = useState<"aprobada" | "rechazada" | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decidir(decision: "aprobada" | "rechazada") {
    setTrabajando(true)
    setError(null)
    const { error: err } = await supabase.rpc("revisar_solicitud", { p_id: s.id, p_decision: decision, p_nota: nota || null })
    setTrabajando(false)
    if (err) {
      setError(err.message.split(": ").slice(1).join(": ") || "No se pudo guardar la decisión.")
      return
    }
    setConfirmando(null)
    await onRevisada()
  }

  const fecha = new Date(s.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })

  return (
    <article className="bg-white border border-zinc-200 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg text-zinc-900">{s.nombre}</h2>
          <p className="text-xs text-zinc-500">{s.tipo_negocio ? `${s.tipo_negocio} · ` : ""}{s.ciudad} · enviada el {fecha}</p>
        </div>
        <span className={cn("text-[10px] uppercase tracking-widest px-2 py-1 border",
          s.estado === "pendiente" && "border-amber-300 text-amber-800 bg-amber-50",
          s.estado === "aprobada" && "border-emerald-300 text-emerald-800 bg-emerald-50",
          s.estado === "rechazada" && "border-zinc-300 text-zinc-600 bg-zinc-50")}>
          {s.estado}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 text-sm text-zinc-700">
        <Dato icono={MapPin} texto={s.direccion} />
        <Dato icono={Clock} texto={s.horario} />
        <Dato icono={Package} texto={`${s.capacidad_bolsas} bolsas de capacidad`} />
        <Dato icono={Phone} texto={`${s.contacto_nombre} · ${s.telefono}`} />
        {correo && <Dato icono={Mail} texto={correo} />}
      </div>
      {s.mensaje && <p className="text-sm text-zinc-600 border-l-2 border-zinc-200 pl-3">{s.mensaje}</p>}
      {s.nota_admin && <p className="text-xs text-zinc-500">Tu nota: {s.nota_admin}</p>}

      {s.estado === "pendiente" && (
        <div className="space-y-3 border-t border-zinc-100 pt-4">
          <label className="block">
            <span className="text-xs text-zinc-500 uppercase tracking-widest">Nota para el centro (opcional)</span>
            <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300}
              placeholder="Ej. Bienvenidos, pasamos el lunes a dejar el material"
              className="mt-1.5 h-10 w-full border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900" />
          </label>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          {confirmando ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-zinc-700 mr-2">
                {confirmando === "aprobada"
                  ? "Al aprobar, esta cuenta pasa a ser centro de acopio. ¿Confirmas?"
                  : "¿Confirmas que rechazas esta solicitud?"}
              </p>
              <button type="button" disabled={trabajando} onClick={() => decidir(confirmando)}
                className="h-9 px-4 bg-zinc-900 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1.5">
                {trabajando && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Sí, confirmar
              </button>
              <button type="button" disabled={trabajando} onClick={() => setConfirmando(null)}
                className="h-9 px-4 border border-zinc-300 text-xs text-zinc-700">Cancelar</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmando("aprobada")}
                className="h-9 px-4 bg-emerald-600 text-white text-xs font-medium flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Aprobar
              </button>
              <button type="button" onClick={() => setConfirmando("rechazada")}
                className="h-9 px-4 border border-zinc-300 text-xs text-zinc-700 flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Rechazar
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function Dato({ icono: Icono, texto }: { icono: typeof MapPin; texto: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icono className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" aria-hidden="true" />
      <p className="break-words">{texto}</p>
    </div>
  )
}
