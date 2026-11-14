"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, ShieldAlert, RefreshCw, Smartphone, Monitor, Tablet, Bot, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { EVENTOS, type Evento } from "@/lib/actividad"

interface Registro {
  id: number
  created_at: string
  user_id: string | null
  correo: string | null
  evento: Evento
  detalle: Record<string, unknown>
  ip: string | null
  pais: string | null
  region: string | null
  ciudad: string | null
  dispositivo: string | null
  so: string | null
  navegador: string | null
  pwa: boolean | null
}

interface Resumen {
  eventos: number
  usuarios_activos: number
  activos_hoy: number
  inicios_sesion: number
  registros: number
  fotos_subidas: number
  outfits_generados: number
  por_evento: Record<string, number>
  por_dispositivo: Record<string, number>
  por_so: Record<string, number>
  por_ciudad: { ciudad: string; n: number }[]
  por_dia: { dia: string; usuarios: number; eventos: number }[]
}

const RANGOS = [1, 7, 30, 90] as const
const ICONO_DISPOSITIVO: Record<string, typeof Smartphone> = { movil: Smartphone, tablet: Tablet, escritorio: Monitor, bot: Bot }
const NOMBRE_DISPOSITIVO: Record<string, string> = { movil: "Celular", tablet: "Tablet", escritorio: "Computadora", bot: "Bot", desconocido: "Desconocido" }

/** Bitácora de actividad: quién entra, cuándo, desde dónde y qué hace. Solo es_admin. */
export default function ActividadPage() {
  const supabase = useMemo(() => createClient(), [])
  const [acceso, setAcceso] = useState<"cargando" | "si" | "no">("cargando")
  const [dias, setDias] = useState<(typeof RANGOS)[number]>(7)
  const [filtro, setFiltro] = useState<Evento | "">("")
  const [usuario, setUsuario] = useState<{ id: string; correo: string } | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    const [r, l] = await Promise.all([
      supabase.rpc("actividad_resumen", { p_dias: dias }),
      supabase.rpc("actividad_reciente", { p_limite: 300, p_evento: filtro || null, p_user: usuario?.id ?? null }),
    ])
    setCargando(false)
    if (r.error || l.error) {
      setError((r.error ?? l.error)!.message)
      return
    }
    setResumen(r.data as Resumen)
    setRegistros((l.data ?? []) as Registro[])
  }, [supabase, dias, filtro, usuario])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.rpc("es_admin")
      setAcceso(data === true ? "si" : "no")
    })()
  }, [supabase])

  useEffect(() => {
    if (acceso !== "si") return
    // Fuera del cuerpo del efecto: recarga al cambiar periodo, evento o cuenta.
    const t = setTimeout(() => void cargar(), 0)
    return () => clearTimeout(t)
  }, [acceso, cargar])

  if (acceso === "cargando") {
    return <div className="min-h-dvh flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>
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

  return (
    <main className="min-h-dvh bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Administración</p>
            <h1 className="font-serif text-2xl text-zinc-900">Actividad</h1>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/admin" className="underline underline-offset-2 text-zinc-600">Solicitudes</Link>
            <Link href="/" className="underline underline-offset-2 text-zinc-600">Volver a la app</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Filtros en una sola fila */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-zinc-300 bg-white" role="group" aria-label="Periodo">
            {RANGOS.map((d) => (
              <button key={d} type="button" onClick={() => setDias(d)} aria-pressed={dias === d}
                className={cn("h-9 px-3 text-xs", dias === d ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900")}>
                {d === 1 ? "Hoy" : `${d} días`}
              </button>
            ))}
          </div>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as Evento | "")} aria-label="Tipo de evento"
            className="h-9 border border-zinc-300 bg-white px-2 text-xs text-zinc-700">
            <option value="">Todos los eventos</option>
            {Object.entries(EVENTOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {usuario && (
            <button type="button" onClick={() => setUsuario(null)}
              className="h-9 px-3 border border-zinc-300 bg-white text-xs text-zinc-700">
              {usuario.correo} ✕
            </button>
          )}
          <button type="button" onClick={() => void cargar()} disabled={cargando}
            className="h-9 px-3 border border-zinc-300 bg-white text-xs text-zinc-700 flex items-center gap-1.5 ml-auto disabled:opacity-50">
            <RefreshCw className={cn("w-3.5 h-3.5", cargando && "animate-spin")} /> Actualizar
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">
            {error.includes("actividad") || error.includes("function")
              ? "Falta aplicar la migración supabase/26-actividad.sql."
              : error}
          </p>
        )}

        {resumen && (
          <>
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-zinc-200 border border-zinc-200">
              <Kpi titulo="Usuarios activos" valor={resumen.usuarios_activos} />
              <Kpi titulo="Activos hoy" valor={resumen.activos_hoy} />
              <Kpi titulo="Inicios de sesión" valor={resumen.inicios_sesion} />
              <Kpi titulo="Cuentas nuevas" valor={resumen.registros} />
              <Kpi titulo="Fotos subidas" valor={resumen.fotos_subidas} />
              <Kpi titulo="Outfits generados" valor={resumen.outfits_generados} />
            </section>

            <section className="bg-white border border-zinc-200 p-5">
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Usuarios activos por día</h2>
              <Columnas datos={resumen.por_dia} />
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <Barras titulo="Dispositivo (usuarios)" datos={Object.entries(resumen.por_dispositivo).map(([k, n]) => [NOMBRE_DISPOSITIVO[k] ?? k, n])} />
              <Barras titulo="Sistema (usuarios)" datos={Object.entries(resumen.por_so)} />
              <Barras titulo="Ciudad (usuarios)" datos={resumen.por_ciudad.map((c) => [c.ciudad, c.n])} />
            </section>
            <Barras titulo="Eventos" datos={Object.entries(resumen.por_evento).map(([k, n]) => [EVENTOS[k as Evento] ?? k, n])} />
          </>
        )}

        <section className="bg-white border border-zinc-200">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 px-5 pt-5 pb-3">
            Registro {registros.length === 300 && <span className="normal-case tracking-normal">(últimos 300)</span>}
          </h2>
          {registros.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-12">Sin actividad registrada.</p>
          ) : (
            <>
            {/* Celular: una tarjeta por evento. Pantallas anchas: tabla. */}
            <ul className="md:hidden divide-y divide-zinc-100 border-t border-zinc-200">
              {registros.map((r) => <Tarjeta key={r.id} r={r} onUsuario={setUsuario} />)}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-zinc-500 border-y border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className="px-4 py-2 font-medium">Cuándo</th>
                    <th className="px-4 py-2 font-medium">Quién</th>
                    <th className="px-4 py-2 font-medium">Qué</th>
                    <th className="px-4 py-2 font-medium">Dónde</th>
                    <th className="px-4 py-2 font-medium">Dispositivo</th>
                    <th className="px-4 py-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => <Fila key={r.id} r={r} onUsuario={setUsuario} />)}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

type AlElegirUsuario = (u: { id: string; correo: string }) => void

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function detalleVisible(r: Registro) {
  const foto = typeof r.detalle?.foto === "string" ? r.detalle.foto : null
  const extra = Object.entries(r.detalle ?? {}).filter(([k]) => k !== "foto" && k !== "prenda_id")
    .map(([k, v]) => `${k}: ${String(v)}`).join(" · ")
  return { foto, extra }
}

function Quien({ r, onUsuario }: { r: Registro; onUsuario: AlElegirUsuario }) {
  if (!r.user_id || !r.correo) return <span className="text-zinc-400">anónimo</span>
  return (
    <button type="button" onClick={() => onUsuario({ id: r.user_id!, correo: r.correo! })}
      className="text-zinc-900 hover:underline underline-offset-2 truncate max-w-full text-left" title="Ver solo esta cuenta">
      {r.correo}
    </button>
  )
}

function Miniatura({ foto }: { foto: string }) {
  return (
    <a href={foto} target="_blank" rel="noreferrer" className="shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto} alt="Foto subida" className="w-10 h-10 object-cover border border-zinc-200" />
    </a>
  )
}

function Equipo({ r }: { r: Registro }) {
  const Icono = ICONO_DISPOSITIVO[r.dispositivo ?? ""] ?? HelpCircle
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icono className="w-3.5 h-3.5 text-zinc-500" aria-label={NOMBRE_DISPOSITIVO[r.dispositivo ?? "desconocido"] ?? r.dispositivo ?? ""} />
      {[r.so, r.navegador].filter(Boolean).join(" · ") || "—"}
      {r.pwa && <span className="text-[10px] uppercase tracking-wider border border-zinc-300 px-1">app</span>}
    </span>
  )
}

function Tarjeta({ r, onUsuario }: { r: Registro; onUsuario: AlElegirUsuario }) {
  const { foto, extra } = detalleVisible(r)
  const lugar = [r.ciudad, r.region, r.pais].filter(Boolean).join(", ")
  return (
    <li className="px-4 py-3 text-xs flex gap-3">
      {foto && <Miniatura foto={foto} />}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-zinc-900">{EVENTOS[r.evento] ?? r.evento}</p>
          <time className="shrink-0 tabular-nums text-zinc-500" dateTime={r.created_at}>{fechaCorta(r.created_at)}</time>
        </div>
        <div className="truncate"><Quien r={r} onUsuario={onUsuario} /></div>
        {extra && <p className="text-zinc-500 break-words">{extra}</p>}
        <p className="text-zinc-600 flex flex-wrap gap-x-3 gap-y-1">
          <Equipo r={r} />
          {lugar && <span>{lugar}</span>}
          {r.ip && <span className="tabular-nums text-zinc-400">{r.ip}</span>}
        </p>
      </div>
    </li>
  )
}

function Fila({ r, onUsuario }: { r: Registro; onUsuario: AlElegirUsuario }) {
  const { foto, extra } = detalleVisible(r)
  return (
    <tr className="border-b border-zinc-100 align-top hover:bg-zinc-50">
      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-zinc-700" title={r.created_at}>{fechaCorta(r.created_at)}</td>
      <td className="px-4 py-2.5 max-w-[200px] truncate"><Quien r={r} onUsuario={onUsuario} /></td>
      <td className="px-4 py-2.5 min-w-[220px]">
        <div className="flex items-start gap-2">
          {foto && <Miniatura foto={foto} />}
          <div>
            <p className="text-zinc-900">{EVENTOS[r.evento] ?? r.evento}</p>
            {extra && <p className="text-zinc-500 break-words">{extra}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-700">
        {[r.ciudad, r.region, r.pais].filter(Boolean).join(", ") || <span className="text-zinc-400">—</span>}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-700"><Equipo r={r} /></td>
      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-zinc-500">{r.ip ?? "—"}</td>
    </tr>
  )
}

function Kpi({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="bg-white p-4">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">{titulo}</p>
      <p className="font-serif text-3xl text-zinc-900 tabular-nums mt-1">{valor.toLocaleString("es-MX")}</p>
    </div>
  )
}

/** Barras horizontales ordenadas: una sola serie, un solo color, valor como texto. */
function Barras({ titulo, datos }: { titulo: string; datos: [string, number][] }) {
  const orden = [...datos].sort((a, b) => b[1] - a[1]).slice(0, 10)
  const max = Math.max(1, ...orden.map(([, n]) => n))
  return (
    <div className="bg-white border border-zinc-200 p-5">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{titulo}</h2>
      {orden.length === 0 ? <p className="text-xs text-zinc-400">Sin datos</p> : (
        <ul className="space-y-2.5">
          {orden.map(([k, n]) => (
            <li key={k} className="text-xs" title={`${k}: ${n}`}>
              <div className="flex justify-between gap-2 text-zinc-700 mb-1">
                <span className="truncate">{k}</span>
                <span className="tabular-nums text-zinc-900">{n.toLocaleString("es-MX")}</span>
              </div>
              <div className="h-1.5 bg-zinc-100">
                <div className="h-full bg-zinc-800 rounded-r-[2px]" style={{ width: `${(n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Columnas por día con tooltip al pasar el dedo o el mouse. */
function Columnas({ datos }: { datos: Resumen["por_dia"] }) {
  const [activo, setActivo] = useState<number | null>(null)
  if (datos.length === 0) return <p className="text-xs text-zinc-400">Sin datos</p>
  const max = Math.max(1, ...datos.map((d) => d.usuarios))
  const fmt = (dia: string) => new Date(`${dia}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
  const sel = activo !== null ? datos[activo] : datos[datos.length - 1]
  return (
    <div>
      <p className="text-xs text-zinc-600 mb-3 h-4 tabular-nums">
        {fmt(sel.dia)}: <span className="text-zinc-900 font-medium">{sel.usuarios}</span> usuarios · {sel.eventos} eventos
      </p>
      <div className="flex items-end gap-[2px] h-32 border-b border-zinc-200" onMouseLeave={() => setActivo(null)}>
        {datos.map((d, i) => (
          <button key={d.dia} type="button" aria-label={`${fmt(d.dia)}: ${d.usuarios} usuarios`}
            onMouseEnter={() => setActivo(i)} onFocus={() => setActivo(i)} onClick={() => setActivo(i)}
            className="flex-1 h-full flex items-end group min-w-[3px]">
            <span className={cn("w-full rounded-t-[4px] transition-colors", activo === i ? "bg-zinc-900" : "bg-zinc-700 group-hover:bg-zinc-900")}
              style={{ height: `${Math.max(2, (d.usuarios / max) * 100)}%` }} />
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500 mt-1.5 tabular-nums">
        <span>{fmt(datos[0].dia)}</span>
        <span>{fmt(datos[datos.length - 1].dia)}</span>
      </div>
    </div>
  )
}
