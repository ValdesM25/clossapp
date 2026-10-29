"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, MapPin, Store, BarChart3, Users, CheckCircle2, Clock, XCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"
import { validarSolicitud, SOLICITUD_VACIA, type SolicitudForm, type SolicitudDB } from "@/lib/solicitudes"

const inputClass = "mt-1.5 h-11 w-full rounded-none border border-zinc-300 text-sm text-zinc-900 focus-visible:ring-0 focus-visible:border-zinc-900"

const BENEFICIOS = [
  { icono: Users, titulo: "Más visitas", texto: "Cada donante y cada entrega del marketplace es una persona que entra a tu negocio." },
  { icono: MapPin, titulo: "Apareces en el mapa", texto: "Tu local aparece en Clossapp como Punto verde." },
  { icono: BarChart3, titulo: "Reporte de impacto", texto: "Cada mes, cuántas prendas recibiste y a cuántas familias ayudaste." },
]

type Estado = "cargando" | "sin-sesion" | "ya-es-centro" | "formulario" | "enviada"

/** "Quiero ser centro de acopio": cualquier cuenta puede pedirlo; Mauri lo aprueba en /admin. */
export default function CentrosPage() {
  // Un solo cliente: es dependencia del efecto de carga.
  const supabase = useMemo(() => createClient(), [])
  const [estado, setEstado] = useState<Estado>("cargando")
  const [userId, setUserId] = useState<string | null>(null)
  const [solicitud, setSolicitud] = useState<SolicitudDB | null>(null)
  const [form, setForm] = useState<SolicitudForm>(SOLICITUD_VACIA)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let activo = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!activo) return
      if (!user) return setEstado("sin-sesion")
      setUserId(user.id)
      const [{ data: perfil }, { data: previas }] = await Promise.all([
        supabase.from("perfiles").select("rol").eq("user_id", user.id).maybeSingle(),
        supabase.from("solicitudes_acopio").select("*").order("created_at", { ascending: false }).limit(1),
      ])
      if (!activo) return
      if (perfil?.rol === "acopio") return setEstado("ya-es-centro")
      const ultima = (previas?.[0] as SolicitudDB | undefined) ?? null
      setSolicitud(ultima)
      // Con una rechazada se puede volver a pedir; pendiente o aprobada muestran su estado.
      setEstado(ultima && ultima.estado !== "rechazada" ? "enviada" : "formulario")
    })()
    return () => { activo = false }
  }, [supabase])

  function campo<K extends keyof SolicitudForm>(k: K, v: SolicitudForm[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    const invalido = validarSolicitud(form)
    if (invalido) return setError(invalido)
    setEnviando(true)
    setError(null)
    const { data, error: err } = await supabase.from("solicitudes_acopio").insert({
      user_id: userId,
      nombre: form.nombre.trim(),
      direccion: form.direccion.trim(),
      ciudad: form.ciudad.trim(),
      horario: form.horario.trim(),
      capacidad_bolsas: Number(form.capacidad_bolsas),
      contacto_nombre: form.contacto_nombre.trim(),
      telefono: form.telefono.trim(),
      tipo_negocio: form.tipo_negocio.trim() || null,
      mensaje: form.mensaje.trim() || null,
    }).select("*").single()
    setEnviando(false)
    if (err) {
      setError(err.code === "23505" ? "Ya tienes una solicitud en revisión." : "No se pudo enviar. Revisa los datos e intenta de nuevo.")
      return
    }
    setSolicitud(data as SolicitudDB)
    setEstado("enviada")
  }

  return (
    <main className="min-h-dvh bg-white">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        <header className="text-center space-y-3">
          <Link href="/" className="inline-block mb-2"><img src="/logo.svg" alt="Clossapp" className="mx-auto h-10 w-auto" /></Link>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Centros de acopio</p>
          <h1 className="font-serif text-3xl text-zinc-900">Haz de tu negocio un Punto verde</h1>
          <p className="text-sm text-zinc-500 max-w-lg mx-auto leading-relaxed">
            Recibe donaciones de ropa y entregas del marketplace de Clossapp. Ayudas a que la ropa tenga otra vida y llevas gente a tu local.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          {BENEFICIOS.map(({ icono: Icono, titulo, texto }) => (
            <div key={titulo} className="border border-zinc-200 p-4 space-y-1.5">
              <Icono className="w-4 h-4 text-zinc-900" aria-hidden="true" />
              <p className="text-sm font-medium text-zinc-900">{titulo}</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{texto}</p>
            </div>
          ))}
        </section>

        <section className="border border-zinc-900 p-6">
          {estado === "cargando" && (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
          )}

          {estado === "sin-sesion" && (
            <div className="text-center space-y-4 py-4">
              <Store className="w-6 h-6 mx-auto text-zinc-900" aria-hidden="true" />
              <p className="text-sm text-zinc-700">Para enviar tu solicitud, primero crea una cuenta o entra.</p>
              <p className="text-xs text-zinc-500">Te recomendamos usar el correo del negocio: al aprobarse, esa cuenta será la del centro.</p>
              <Link href="/" className="inline-flex h-11 px-6 items-center bg-zinc-900 text-white text-sm font-medium tracking-wide">
                Crear cuenta o entrar
              </Link>
              <p className="text-[11px] text-zinc-400">Después vuelve a <span className="font-mono">clossapp.vercel.app/centros</span>.</p>
            </div>
          )}

          {estado === "ya-es-centro" && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600" aria-hidden="true" />
              <p className="text-sm text-zinc-700">Esta cuenta ya es un centro de acopio.</p>
              <Link href="/" className="text-sm underline underline-offset-2">Ir a mi portal</Link>
            </div>
          )}

          {estado === "enviada" && solicitud && <EstadoSolicitud solicitud={solicitud} />}

          {estado === "formulario" && (
            <form onSubmit={enviar} className="space-y-4" noValidate>
              <div>
                <h2 className="font-serif text-xl text-zinc-900">Quiero ser centro de acopio</h2>
                {solicitud?.estado === "rechazada" && (
                  <p className="mt-2 text-xs text-zinc-600 border border-zinc-200 px-3 py-2">
                    Tu solicitud anterior no se aprobó{solicitud.nota_admin ? `: ${solicitud.nota_admin}` : "."} Puedes enviar una nueva.
                  </p>
                )}
              </div>
              <Campo id="nombre" label="Nombre del negocio" value={form.nombre} onChange={(v) => campo("nombre", v)} maxLength={80} />
              <Campo id="tipo" label="Tipo de negocio (opcional)" placeholder="Lavandería, tienda, café, escuela…" value={form.tipo_negocio} onChange={(v) => campo("tipo_negocio", v)} maxLength={60} />
              <Campo id="direccion" label="Dirección" value={form.direccion} onChange={(v) => campo("direccion", v)} maxLength={200} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="ciudad" label="Ciudad" value={form.ciudad} onChange={(v) => campo("ciudad", v)} maxLength={60} />
                <Campo id="horario" label="Horario" placeholder="L-S 9:00 a 19:00" value={form.horario} onChange={(v) => campo("horario", v)} maxLength={120} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="capacidad" label="¿Cuántas bolsas puedes guardar?" type="number" inputMode="numeric" value={form.capacidad_bolsas} onChange={(v) => campo("capacidad_bolsas", v)} />
                <Campo id="telefono" label="Teléfono" type="tel" autoComplete="tel" value={form.telefono} onChange={(v) => campo("telefono", v)} maxLength={20} />
              </div>
              <Campo id="contacto" label="Persona responsable" autoComplete="name" value={form.contacto_nombre} onChange={(v) => campo("contacto_nombre", v)} maxLength={80} />
              <div>
                <label htmlFor="mensaje" className="text-xs text-zinc-500 uppercase tracking-widest">Algo más que debamos saber (opcional)</label>
                <textarea id="mensaje" value={form.mensaje} maxLength={600} rows={3}
                  onChange={(e) => campo("mensaje", e.target.value)}
                  className="mt-1.5 w-full rounded-none border border-zinc-300 p-3 text-sm text-zinc-900 outline-none focus:border-zinc-900" />
              </div>
              {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
              <button type="submit" disabled={enviando}
                className="w-full h-11 bg-zinc-900 text-white text-sm font-medium tracking-wide disabled:opacity-50 flex items-center justify-center">
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar solicitud"}
              </button>
              <p className="text-[11px] text-zinc-400 text-center">La revisamos y te contactamos. Al aprobarse, esta cuenta se convierte en la del centro.</p>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}

function Campo({ id, label, value, onChange, ...rest }: {
  id: string; label: string; value: string; onChange: (v: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "id">) {
  return (
    <div>
      <label htmlFor={id} className="text-xs text-zinc-500 uppercase tracking-widest">{label}</label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} {...rest} />
    </div>
  )
}

function EstadoSolicitud({ solicitud }: { solicitud: SolicitudDB }) {
  const aprobada = solicitud.estado === "aprobada"
  const Icono = aprobada ? CheckCircle2 : solicitud.estado === "pendiente" ? Clock : XCircle
  return (
    <div className="text-center space-y-3 py-4">
      <Icono className={`w-6 h-6 mx-auto ${aprobada ? "text-emerald-600" : "text-zinc-900"}`} aria-hidden="true" />
      <p className="font-serif text-xl text-zinc-900">
        {aprobada ? "¡Tu centro fue aprobado!" : "Recibimos tu solicitud"}
      </p>
      <p className="text-sm text-zinc-600">
        {aprobada
          ? "Cierra sesión y vuelve a entrar: tu cuenta ya abre el portal del centro."
          : `Estamos revisando "${solicitud.nombre}". Te contactaremos al ${solicitud.telefono}.`}
      </p>
      {solicitud.nota_admin && <p className="text-xs text-zinc-500">Nota: {solicitud.nota_admin}</p>}
      <Link href="/" className="inline-block text-sm underline underline-offset-2">Volver a Clossapp</Link>
    </div>
  )
}
