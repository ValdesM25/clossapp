"use client"

import { useEffect, useRef, useState } from "react"
import { useCapa } from "@/hooks/use-capa"
import { motion } from "framer-motion"
import { X, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useAuthContext } from "@/context/auth-context"
import { useVentas, modoDePublicada, type Publicada, type Venta } from "@/hooks/use-ventas"
import { abrirCuentaCobro } from "@/services/marketplace.service"
import { estadoVenta, totales, pesos, fechaLegible, diasPublicada, type TonoVenta } from "@/lib/ventas"

type Pestana = "vendidas" | "publicadas" | "rentas"

const TONO: Record<TonoVenta, string> = {
  accion: "text-amber-700",
  espera: "text-zinc-500",
  listo: "text-emerald-700",
  cancelado: "text-zinc-400",
}

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" })

function Vacio({ texto }: { texto: string }) {
  return <p className="border border-zinc-100 py-10 px-4 text-center text-xs text-zinc-500">{texto}</p>
}

function FilaVenta({ venta, cuentaActiva }: { venta: Venta; cuentaActiva: boolean }) {
  const primera = venta.items[0]?.prenda
  const estado = estadoVenta(venta.status, venta.pago, cuentaActiva, venta.items.find((i) => i.fechaRenta)?.fechaRenta)
  if (!estado) return null
  const depositado = venta.pago?.estado === "enviado"
  return (
    <li className="flex items-center gap-3 border border-zinc-100 p-3">
      {primera?.image_url && <img src={primera.image_url} alt="" className="w-12 h-12 object-cover shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-900 truncate">
          {primera?.name ?? "Prenda"}{venta.items.length > 1 && ` y ${venta.items.length - 1} más`}
        </p>
        <p className={cn("text-[11px] leading-snug", TONO[estado.tono])}>{estado.etiqueta}</p>
        {estado.tono !== "cancelado" && (
          <p className="text-xs text-zinc-700 mt-0.5">{depositado ? "Te llegaron" : "Te llegan"} {pesos(venta.netoCentavos)}</p>
        )}
      </div>
      <p className="text-[11px] text-zinc-500 shrink-0 self-start">{fechaCorta(venta.fecha)}</p>
    </li>
  )
}

function FilaPublicada({ prenda, ahora, cambiarPrecio, quitar }: {
  prenda: Publicada
  ahora: Date
  cambiarPrecio: (p: Publicada, nuevo: number) => Promise<{ error?: string }>
  quitar: (p: Publicada) => Promise<{ error?: string }>
}) {
  const modo = modoDePublicada(prenda)
  const precio = modo === "venta" ? prenda.precio : prenda.precio_renta
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState("")
  const [confirmando, setConfirmando] = useState(false)
  const [ocupada, setOcupada] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function correr(accion: () => Promise<{ error?: string }>, alTerminar: () => void) {
    setOcupada(true)
    setError(null)
    const r = await accion()
    setOcupada(false)
    if (r.error) setError(r.error)
    else alTerminar()
  }

  function guardar() {
    const nuevo = parseFloat(valor)
    if (!(nuevo > 0)) return setError("Escribe un precio mayor a 0.")
    void correr(() => cambiarPrecio(prenda, nuevo), () => setEditando(false))
  }

  const dias = prenda.publicada_en ? diasPublicada(prenda.publicada_en, ahora) : null

  return (
    <li className="border border-zinc-100 p-3 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <img src={prenda.image_url} alt="" className="w-12 h-12 object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-900 truncate">{prenda.name}</p>
          <p className="text-xs text-zinc-700">
            {precio != null ? `$${precio.toLocaleString("es-MX")}` : "Sin precio"}{modo === "renta" && " por día"}
            <span className="text-zinc-500"> · {modo === "venta" ? "Venta" : "Renta"}</span>
          </p>
          {dias !== null && <p className="text-[11px] text-zinc-500">{dias === 0 ? "Publicada hoy" : `Lleva ${dias} ${dias === 1 ? "día" : "días"}`}</p>}
        </div>
      </div>

      {editando ? (
        <div className="flex gap-2">
          <Input value={valor} onChange={(e) => setValor(e.target.value)} type="number" inputMode="decimal" min="1" autoFocus
            aria-label="Nuevo precio en MXN" placeholder="Nuevo precio"
            className="h-10 rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900" />
          <button type="button" onClick={guardar} disabled={ocupada || !valor}
            className="h-10 px-4 bg-zinc-900 text-white text-xs font-medium disabled:opacity-50">{ocupada ? "Guardando…" : "Guardar"}</button>
          <button type="button" onClick={() => { setEditando(false); setError(null) }} disabled={ocupada}
            className="h-10 px-3 text-xs text-zinc-600">Cancelar</button>
        </div>
      ) : confirmando ? (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-xs text-zinc-700">¿Quitarla de {modo === "venta" ? "la venta" : "las rentas"}?</p>
          <button type="button" onClick={() => void correr(() => quitar(prenda), () => setConfirmando(false))} disabled={ocupada}
            className="h-10 px-4 bg-zinc-900 text-white text-xs font-medium disabled:opacity-50">{ocupada ? "Quitando…" : "Sí, quitar"}</button>
          <button type="button" onClick={() => { setConfirmando(false); setError(null) }} disabled={ocupada}
            className="h-10 px-3 text-xs text-zinc-600">No</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setValor(precio != null ? String(precio) : ""); setError(null); setEditando(true) }}
            className="h-10 border border-zinc-300 text-xs text-zinc-900 hover:border-zinc-900 transition-colors">Cambiar precio</button>
          <button type="button" onClick={() => { setError(null); setConfirmando(true) }}
            className="h-10 border border-zinc-300 text-xs text-zinc-900 hover:border-zinc-900 transition-colors">Quitar</button>
        </div>
      )}
      {error && <p role="status" className="text-xs text-zinc-600">{error}</p>}
    </li>
  )
}

interface VenderViewProps {
  onPublicar: () => void
  onCerrar: () => void
  /** Aviso del Shop (ej. "Publicada"): la capa tapa el Shop y de otro modo no se vería. */
  aviso: string | null
  /** Mientras el formulario de publicar está encima, Escape lo cierra a él y no a esta capa. */
  bloqueada: boolean
}

/** Espacio del vendedor. Plus ve sus ventas; Elite, además, totales, lo publicado y sus rentas. */
export function VenderView({ onPublicar, onCerrar, aviso, bloqueada }: VenderViewProps) {
  const { userId, plan, cobrosEstado } = useAuthContext()
  const { ventas, publicadas, rentasEnCurso, cargando, cambiarPrecio, quitar } = useVentas(userId)
  const [pestana, setPestana] = useState<Pestana>("vendidas")
  const [ahora] = useState(() => new Date())
  const [abriendoCobros, setAbriendoCobros] = useState(false)
  const [errorCobros, setErrorCobros] = useState<string | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const capa = useRef<HTMLDivElement>(null)
  const esElite = plan === "elite"
  const cuentaActiva = cobrosEstado === "activa"
  const t = totales(ventas, ahora)

  useEffect(() => { titulo.current?.focus() }, [])
  useCapa(capa, onCerrar, !bloqueada)

  // Con la cuenta activa abre el panel de Stripe con los depósitos.
  async function irACobros() {
    setAbriendoCobros(true)
    setErrorCobros(null)
    try {
      const r = await abrirCuentaCobro()
      if (r.url) return window.location.assign(r.url)
      window.location.reload()
    } catch (err) {
      setErrorCobros(err instanceof Error ? err.message : "No se pudo abrir tu cuenta de cobro.")
      setAbriendoCobros(false)
    }
  }

  const lista = cargando ? (
    <Vacio texto="Cargando…" />
  ) : ventas.length === 0 ? (
    <Vacio texto="Aún no vendes nada. Publica tu primera prenda." />
  ) : (
    <ul className="flex flex-col gap-2">
      {ventas.map((v) => <FilaVenta key={v.ordenId} venta={v} cuentaActiva={cuentaActiva} />)}
    </ul>
  )

  return (
    <div ref={capa} role="dialog" aria-modal="true" aria-label="Vender" className="fixed inset-0 z-[90] bg-white overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 ref={titulo} tabIndex={-1} className="font-serif text-2xl text-zinc-900 outline-none">Vender</h1>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="w-11 h-11 -mr-3 flex items-center justify-center text-zinc-500 hover:text-zinc-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onPublicar}
          className="w-full h-12 bg-zinc-900 text-white text-sm font-medium">
          + Publicar prenda
        </motion.button>

        {aviso && <p role="status" className="border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-700">{aviso}</p>}

        {esElite ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {([["Por cobrar", t.porCobrarCentavos], ["Cobrado este mes", t.cobradoMesCentavos], ["Cobrado en total", t.cobradoTotalCentavos]] as const).map(([etiqueta, centavos]) => (
                <div key={etiqueta} className="border border-zinc-200 p-3 flex flex-col justify-between gap-1">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-tight">{etiqueta}</p>
                  <p className="font-serif text-lg text-zinc-900 break-words">{pesos(centavos)}</p>
                </div>
              ))}
            </div>

            <div role="tablist" className="flex border-b border-zinc-200">
              {(["vendidas", "publicadas", "rentas"] as const).map((p) => (
                <button key={p} type="button" role="tab" aria-selected={pestana === p} onClick={() => setPestana(p)}
                  className={cn("flex-1 py-2.5 text-xs font-medium tracking-widest uppercase transition-colors border-b-2 -mb-px",
                    pestana === p ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500")}>
                  {p === "vendidas" ? "Vendidas" : p === "publicadas" ? "Publicadas" : "Rentas"}
                </button>
              ))}
            </div>

            {pestana === "vendidas" && lista}
            {pestana === "publicadas" && (
              cargando ? <Vacio texto="Cargando…" /> : publicadas.length === 0 ? (
                <Vacio texto="No tienes prendas publicadas. Publica una para venderla o rentarla." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {publicadas.map((p) => <FilaPublicada key={p.id} prenda={p} ahora={ahora} cambiarPrecio={cambiarPrecio} quitar={quitar} />)}
                </ul>
              )
            )}
            {pestana === "rentas" && (
              cargando ? <Vacio texto="Cargando…" /> : rentasEnCurso.length === 0 ? (
                <Vacio texto="Ninguna de tus prendas está rentada ahora." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {rentasEnCurso.map(({ ordenId, item, compradora }) => (
                    <li key={`${ordenId}-${item.id}`} className="flex items-center gap-3 border border-zinc-100 p-3">
                      <img src={item.prenda.image_url} alt="" className="w-12 h-12 object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-900 truncate">{item.prenda.name}</p>
                        <p className="text-xs text-zinc-700">La tiene {compradora}</p>
                        {item.fechaRenta && <p className="text-[11px] text-zinc-500">Para el {fechaLegible(item.fechaRenta)}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Tus ventas</p>
              {lista}
            </section>
            <div className="border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-600 leading-relaxed">Con Elite ves cuánto llevas ganado, lo que sigue publicado y tus rentas.</p>
              <button type="button" onClick={() => window.location.assign("/planes?plan=elite")}
                className="shrink-0 h-10 px-3 border border-zinc-900 text-zinc-900 text-xs font-medium">Ver Elite</button>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => void irACobros()} disabled={abriendoCobros}
            className="min-h-12 px-4 border border-zinc-200 flex items-center justify-between text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-50">
            {abriendoCobros ? "Abriendo…" : "Mis cobros en Stripe"}
            <ChevronRight className="w-4 h-4 text-zinc-500" aria-hidden="true" />
          </button>
          {errorCobros && <p role="status" className="text-xs text-zinc-600">{errorCobros}</p>}
        </div>
      </div>
    </div>
  )
}
