"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  Pencil,
  MapPin,
  Calendar,
  Sparkles,
  Sun,
  CloudSun,
  RotateCw,
  Check,
  Luggage,
  ArrowRight,
  X,
  Plus,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { pageProps } from "@/constants/animation"
import type { View } from "@/types"

interface PlanificacionViewProps {
  onNavigate?: (v: View) => void
  onBack?: () => void
}

interface OutfitDay {
  id: string
  dayLabel: string
  dayName: string
  temp: string
  weather: "sun" | "cloud-sun" | "cloud"
  status: "ready" | "pending"
  title: string
  description: string
  clothesCount: number
  imageUrl: string
  items?: string[]
}

const OUTFITS_INICIALES: OutfitDay[] = [
  {
    id: "lun-12",
    dayLabel: "LUN 12",
    dayName: "Lunes 12",
    temp: "18°C",
    weather: "sun",
    status: "ready",
    title: "Bonjour, París",
    description: "Llegada y paseo por Le Marais",
    clothesCount: 5,
    imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=700&q=80",
    items: [
      "Suéter tejido crudo de lana",
      "Jeans rectos azul clásico",
      "Sneakers blancos confort",
      "Bolso crossbody marrón",
      "Lentes de sol estilo carey",
    ],
  },
  {
    id: "mar-13",
    dayLabel: "MAR 13",
    dayName: "Martes 13",
    temp: "17°C",
    weather: "cloud-sun",
    status: "ready",
    title: "Arte y un café",
    description: "Museos y cafés de la ciudad",
    clothesCount: 6,
    imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=80",
    items: [
      "Gabardina clásica beige",
      "Camisa blanca de algodón",
      "Pantalón sastre negro tiro alto",
      "Mocasines de piel negros",
      "Bolso estructurado de mano",
      "Bufanda ligera de seda",
    ],
  },
  {
    id: "mie-14",
    dayLabel: "MIÉ 14",
    dayName: "Miércoles 14",
    temp: "19°C",
    weather: "sun",
    status: "ready",
    title: "Una noche especial",
    description: "Cena con vista al Sena",
    clothesCount: 4,
    imageUrl: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=700&q=80",
    items: [
      "Vestido midi satinado negro",
      "Zapatos slingback de tacón cómodo",
      "Clutch de mano elegante",
      "Aretes dorados minimalistas",
    ],
  },
  {
    id: "jue-15",
    dayLabel: "JUE 15",
    dayName: "Jueves 15",
    temp: "16°C",
    weather: "cloud",
    status: "pending",
    title: "Tarde bohemia",
    description: "Montmartre y compras vintage",
    clothesCount: 5,
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=700&q=80",
    items: [
      "Chaqueta biker negra",
      "Jersey de cuello alto gris",
      "Falda midi plisada",
      "Botines negros de piel",
      "Bolso tote mediano",
    ],
  },
  {
    id: "vie-16",
    dayLabel: "VIE 16",
    dayName: "Viernes 16",
    temp: "18°C",
    weather: "sun",
    status: "pending",
    title: "Au Revoir, París",
    description: "Último café y viaje de regreso",
    clothesCount: 4,
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=80",
    items: [
      "Cardigan oversize beige",
      "Camiseta básica blanca",
      "Pantalón de lino cómodo",
      "Sneakers blancos",
    ],
  },
]

interface CategoriaEquipaje {
  id: string
  nombre: string
  empacadas: number
  total: number
  items: string[]
}

const EQUIPAJE_INICIAL: CategoriaEquipaje[] = [
  {
    id: "superiores",
    nombre: "Prendas superiores",
    empacadas: 4,
    total: 6,
    items: ["Suéter tejido crudo", "Camisa blanca oxford", "Blusa de lino negra", "Top de algodón beige"],
  },
  {
    id: "inferiores",
    nombre: "Prendas inferiores",
    empacadas: 3,
    total: 4,
    items: ["Jeans rectos azul clásico", "Pantalón sastre negro", "Falda midi plisada"],
  },
  {
    id: "abrigos",
    nombre: "Abrigos y capas",
    empacadas: 1,
    total: 2,
    items: ["Gabardina clásica beige"],
  },
  {
    id: "calzado",
    nombre: "Calzado",
    empacadas: 1,
    total: 2,
    items: ["Sneakers blancos confort"],
  },
  {
    id: "accesorios",
    nombre: "Accesorios",
    empacadas: 3,
    total: 4,
    items: ["Bolso crossbody marrón", "Lentes de sol carey", "Clutch de mano elegante"],
  },
]

export function PlanificacionView({ onNavigate, onBack }: PlanificacionViewProps) {
  // Estado del viaje editable
  const [destino, setDestino] = useState("París, a tu manera.")
  const [ciudad, setCiudad] = useState("París, Francia")
  const [fechas, setFechas] = useState("12-16 oct. 2026 · 5 días")
  const [estiloViaje, setEstiloViaje] = useState("Ciudad / Casual chic / Equipaje ligero")
  const [tagTemporada, setTagTemporada] = useState("ESCAPADA DE OTOÑO")

  // Outfits de los días
  const [outfits, setOutfits] = useState<OutfitDay[]>(OUTFITS_INICIALES)
  const [diaActivoId, setDiaActivoId] = useState("lun-12")
  const [generandoIA, setGenerandoIA] = useState(false)
  const [rotandoDia, setRotandoDia] = useState<string | null>(null)

  // Checklist de equipaje
  const [equipaje, setEquipaje] = useState<CategoriaEquipaje[]>(EQUIPAJE_INICIAL)

  // Modales
  const [modalEditarViaje, setModalEditarViaje] = useState(false)
  const [modalOutfit, setModalOutfit] = useState<OutfitDay | null>(null)
  const [modalEquipaje, setModalEquipaje] = useState(false)
  const [modalAsistenteIA, setModalAsistenteIA] = useState(false)

  const outfitsListosCount = outfits.filter((o) => o.status === "ready").length
  const totalEmpacadas = equipaje.reduce((acc, c) => acc + c.empacadas, 0)
  const totalRopa = equipaje.reduce((acc, c) => acc + c.total, 0)
  const porcentajeEmpacado = Math.round((totalEmpacadas / (totalRopa || 18)) * 100)

  // Alternar checkbox de categoría
  function toggleCategoria(id: string) {
    setEquipaje((prev) =>
      prev.map((cat) => {
        if (cat.id !== id) return cat
        const completa = cat.empacadas === cat.total
        return {
          ...cat,
          empacadas: completa ? Math.max(0, cat.empacadas - 1) : cat.total,
        }
      })
    )
  }

  // Completar días pendientes con IA
  function handleCompletarConIA() {
    setGenerandoIA(true)
    setTimeout(() => {
      setOutfits((prev) =>
        prev.map((o) => ({
          ...o,
          status: "ready",
        }))
      )
      setGenerandoIA(false)
    }, 1200)
  }

  // Regenerar outfit individual
  function handleRegenerarOutfit(id: string) {
    setRotandoDia(id)
    setTimeout(() => {
      setOutfits((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o
          return {
            ...o,
            title: o.title + " (Estilizado)",
            imageUrl:
              id === "lun-12"
                ? "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=80"
                : id === "mar-13"
                ? "https://images.unsplash.com/photo-1594938298603-c8148c4b4e5b?auto=format&fit=crop&w=700&q=80"
                : "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=700&q=80",
          }
        })
      )
      setRotandoDia(null)
    }, 800)
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-36 px-4 pt-6 sm:pt-8 max-w-6xl mx-auto">
      {/* 1. Header con Breadcrumb, Título y Botón Editar viaje */}
      <div className="flex flex-col gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500">
          <button
            type="button"
            onClick={onBack ?? (() => onNavigate?.("inicio"))}
            className="flex items-center gap-1 hover:text-zinc-900 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Mis viajes</span>
          </button>
          <span className="text-zinc-300">/</span>
          <span className="text-zinc-900 font-medium">París</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 tracking-tight font-normal">
              Tu próximo destino, tu mejor versión.
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Planea tus looks, lleva solo lo necesario y disfruta el viaje.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalEditarViaje(true)}
            className="self-start sm:self-auto h-9 px-3.5 border border-zinc-200 hover:border-zinc-900 text-zinc-700 hover:text-zinc-900 text-xs font-medium flex items-center gap-1.5 transition-colors bg-white shadow-2xs"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Editar viaje</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Banner del Viaje (Tarjeta oscura con foto de París a la derecha) */}
      <div className="bg-[#121212] text-white overflow-hidden relative grid grid-cols-1 md:grid-cols-12 min-h-[220px] shadow-sm">
        {/* Contenido izquierdo */}
        <div className="p-6 sm:p-8 md:col-span-8 flex flex-col justify-between relative z-10">
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-semibold">
                {tagTemporada}
              </span>
              <span className="bg-white/10 px-2.5 py-1 text-[11px] text-zinc-300 tracking-wide border border-white/10 rounded-xs">
                {estiloViaje}
              </span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl text-white font-normal my-2 tracking-tight">
              {destino}
            </h2>

            <div className="flex items-center gap-4 text-xs text-zinc-300 font-light flex-wrap mt-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>{ciudad}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>{fechas}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-6 border-t border-white/10 mt-6 flex-wrap">
            <span className="text-xs text-zinc-300">
              {totalRopa} prendas · {outfitsListosCount} de 5 outfits listos
            </span>

            <button
              type="button"
              onClick={() => setModalAsistenteIA(true)}
              className="text-xs text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors group cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
              <span className="underline underline-offset-4">Asistente de viaje IA</span>
            </button>
          </div>
        </div>

        {/* Imagen derecha (París y tejados) */}
        <div className="md:col-span-4 relative h-48 md:h-auto overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1000&q=80"
            alt="París"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#121212] via-[#121212]/30 to-transparent" />
        </div>
      </div>

      {/* 3. Grid Principal: Outfits a la izquierda y Tu maleta a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Tus outfits, día a día (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Header de sección */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-2xl text-zinc-900 font-normal">Tus outfits, día a día</h3>
              <p className="text-xs text-zinc-400 mt-0.5">{outfitsListosCount} de 5 días listos</p>
            </div>

            <button
              type="button"
              onClick={handleCompletarConIA}
              disabled={generandoIA || outfitsListosCount === 5}
              className="h-10 px-4 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors self-start sm:self-auto shadow-xs"
            >
              <Sparkles className={cn("w-3.5 h-3.5", generandoIA && "animate-spin")} />
              <span>{generandoIA ? "Diseñando looks…" : "Completar viaje con IA"}</span>
            </button>
          </div>

          {/* Selector de días horizontal */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {outfits.map((dia) => {
              const activo = dia.id === diaActivoId
              const listo = dia.status === "ready"
              return (
                <button
                  key={dia.id}
                  type="button"
                  onClick={() => setDiaActivoId(dia.id)}
                  className={cn(
                    "p-3 text-left border transition-all flex flex-col justify-between min-h-[76px]",
                    activo
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                      : listo
                      ? "bg-white text-zinc-900 border-zinc-200 hover:border-zinc-400"
                      : "bg-zinc-50/70 text-zinc-600 border-dashed border-zinc-300 hover:border-zinc-900"
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{dia.dayLabel}</span>
                    <span className="text-[11px] font-normal opacity-80 flex items-center gap-1">
                      {dia.weather === "sun" ? (
                        <Sun className="w-3 h-3 text-amber-400" />
                      ) : (
                        <CloudSun className="w-3 h-3 text-zinc-400" />
                      )}
                      {dia.temp}
                    </span>
                  </div>

                  <span
                    className={cn(
                      "text-[10px] tracking-wide mt-2 font-medium flex items-center gap-1",
                      activo ? "text-zinc-200" : listo ? "text-zinc-600" : "text-zinc-400"
                    )}
                  >
                    {listo ? (
                      <>
                        <Check className="w-2.5 h-2.5" /> 1 outfit listo
                      </>
                    ) : (
                      <>
                        Por planificar <Plus className="w-2.5 h-2.5 ml-auto" />
                      </>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Tarjetas de Outfits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {outfits.slice(0, 3).map((dia) => (
              <div
                key={dia.id}
                className={cn(
                  "border bg-white flex flex-col justify-between transition-shadow hover:shadow-md",
                  dia.id === diaActivoId ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200"
                )}
              >
                {/* Cabecera de la tarjeta */}
                <div className="px-3.5 py-2.5 border-b border-zinc-100 flex items-center justify-between text-xs font-medium text-zinc-700">
                  <span>{dia.dayName}</span>
                  <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                    {dia.weather === "sun" ? (
                      <Sun className="w-3 h-3 text-amber-500" />
                    ) : (
                      <CloudSun className="w-3 h-3" />
                    )}
                    {dia.temp}
                  </span>
                </div>

                {/* Foto Flat lay */}
                <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden group">
                  <img
                    src={dia.imageUrl}
                    alt={dia.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs text-zinc-800 text-[10px] font-semibold px-2 py-0.5 border border-zinc-200/60 shadow-2xs flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-zinc-900" /> IA
                  </span>
                </div>

                {/* Contenido */}
                <div className="p-3.5 flex flex-col gap-1">
                  <h4 className="font-serif text-lg text-zinc-900 font-normal leading-snug">{dia.title}</h4>
                  <p className="text-xs text-zinc-500 line-clamp-1">{dia.description}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">{dia.clothesCount} prendas de tu armario</p>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setModalOutfit(dia)}
                      className="flex-1 h-8 border border-zinc-200 hover:border-zinc-900 text-zinc-800 text-xs font-medium flex items-center justify-center transition-colors bg-white hover:bg-zinc-50"
                    >
                      Ver y editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegenerarOutfit(dia.id)}
                      title="Regenerar outfit"
                      aria-label="Regenerar outfit con IA"
                      className="w-8 h-8 border border-zinc-200 hover:border-zinc-900 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors bg-white"
                    >
                      <RotateCw
                        className={cn("w-3.5 h-3.5", rotandoDia === dia.id && "animate-spin text-zinc-900")}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna Derecha: Tu maleta (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <h3 className="font-serif text-2xl text-zinc-900 font-normal">Tu maleta</h3>

          <div className="border border-zinc-200 p-5 bg-white flex flex-col gap-5 shadow-xs">
            {/* Header de maleta */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-800">
                <Luggage className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-900">Ligera, pero con opciones.</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{totalRopa} prendas · 5 días · 1 maleta</p>
              </div>
            </div>

            {/* Progreso */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
                  LISTA PARA SALIR
                </span>
                <span className="font-medium text-zinc-900">
                  {totalEmpacadas} de {totalRopa} prendas empacadas
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-zinc-900 transition-all duration-500"
                  style={{ width: `${porcentajeEmpacado}%` }}
                />
              </div>
            </div>

            {/* Checklist de categorías */}
            <div className="flex flex-col gap-2.5">
              {equipaje.map((cat) => {
                const completo = cat.empacadas === cat.total
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategoria(cat.id)}
                    className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-4 h-4 border flex items-center justify-center transition-colors",
                          completo ? "bg-zinc-900 border-zinc-900 text-white" : "border-zinc-300 group-hover:border-zinc-500"
                        )}
                      >
                        {completo && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs text-zinc-700">{cat.nombre}</span>
                    </div>

                    <span className="text-xs font-mono text-zinc-400">
                      {cat.empacadas} / {cat.total}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Tip de viaje */}
            <div className="bg-zinc-50 border border-zinc-100 p-3.5 flex items-start gap-2.5 text-zinc-600">
              <Sparkles className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-zinc-900">Más looks, menos equipaje.</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Reutiliza tus básicos en varios días.</p>
              </div>
            </div>

            {/* Botón ver lista de equipaje */}
            <button
              type="button"
              onClick={() => setModalEquipaje(true)}
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center justify-between px-4 transition-colors"
            >
              <span>Ver lista de equipaje</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Footer interno de la sección */}
      <footer className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-800 tracking-wider">clossapp</span>
          <span>·</span>
          <span>Tu estilo. Cualquier destino.</span>
        </div>
        <span>Hecho para viajar ligero.</span>
      </footer>

      {/* ================= MODALES INTERACTIVOS ================= */}

      {/* Modal 1: Editar Viaje */}
      <AnimatePresence>
        {modalEditarViaje && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md p-6 border border-zinc-200 shadow-xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="font-serif text-xl text-zinc-900">Editar detalles del viaje</h3>
                <button
                  type="button"
                  onClick={() => setModalEditarViaje(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="text-zinc-500 uppercase tracking-widest text-[10px] block mb-1">
                    Título del viaje
                  </label>
                  <input
                    type="text"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="w-full h-10 border border-zinc-200 px-3 text-zinc-900 focus:border-zinc-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-zinc-500 uppercase tracking-widest text-[10px] block mb-1">
                    Ciudad y país
                  </label>
                  <input
                    type="text"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    className="w-full h-10 border border-zinc-200 px-3 text-zinc-900 focus:border-zinc-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-zinc-500 uppercase tracking-widest text-[10px] block mb-1">
                    Fechas y duración
                  </label>
                  <input
                    type="text"
                    value={fechas}
                    onChange={(e) => setFechas(e.target.value)}
                    className="w-full h-10 border border-zinc-200 px-3 text-zinc-900 focus:border-zinc-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-zinc-500 uppercase tracking-widest text-[10px] block mb-1">
                    Etiquetas de estilo
                  </label>
                  <input
                    type="text"
                    value={estiloViaje}
                    onChange={(e) => setEstiloViaje(e.target.value)}
                    className="w-full h-10 border border-zinc-200 px-3 text-zinc-900 focus:border-zinc-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setModalEditarViaje(false)}
                  className="h-9 px-4 border border-zinc-200 text-xs text-zinc-600 hover:border-zinc-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setModalEditarViaje(false)}
                  className="h-9 px-4 bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
                >
                  Guardar cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Ver y Editar Outfit */}
      <AnimatePresence>
        {modalOutfit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg p-6 border border-zinc-200 shadow-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                    {modalOutfit.dayName} · {modalOutfit.temp}
                  </span>
                  <h3 className="font-serif text-2xl text-zinc-900">{modalOutfit.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOutfit(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="aspect-[16/10] bg-zinc-100 overflow-hidden">
                <img
                  src={modalOutfit.imageUrl}
                  alt={modalOutfit.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed">{modalOutfit.description}</p>

              <div>
                <h4 className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-2">
                  Prendas combinadas ({modalOutfit.items?.length ?? modalOutfit.clothesCount})
                </h4>
                <div className="flex flex-col gap-2">
                  {modalOutfit.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs text-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-zinc-900" />
                        <span>{item}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 uppercase">En tu maleta</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    handleRegenerarOutfit(modalOutfit.id)
                    setModalOutfit(null)
                  }}
                  className="h-9 px-3.5 border border-zinc-200 text-xs text-zinc-700 hover:border-zinc-900 flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Probar otra combinación</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalOutfit(null)}
                  className="h-9 px-5 bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Lista de equipaje completa */}
      <AnimatePresence>
        {modalEquipaje && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg p-6 border border-zinc-200 shadow-xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="font-serif text-2xl text-zinc-900">Lista completa de equipaje</h3>
                  <p className="text-xs text-zinc-400">
                    {totalEmpacadas} de {totalRopa} prendas empacadas ({porcentajeEmpacado}%)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalEquipaje(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {equipaje.map((cat) => (
                  <div key={cat.id} className="border border-zinc-100 p-3 bg-zinc-50/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 mb-2">
                      <span>{cat.nombre}</span>
                      <span className="font-mono text-zinc-500">
                        {cat.empacadas} / {cat.total}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 pl-1">
                      {cat.items.map((it, idx) => (
                        <label key={idx} className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded-none text-zinc-900" />
                          <span>{it}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-zinc-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setModalEquipaje(false)}
                  className="h-9 px-5 bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 4: Asistente de Viaje IA */}
      <AnimatePresence>
        {modalAsistenteIA && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md p-6 border border-zinc-200 shadow-xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="font-serif text-xl text-zinc-900">Asistente de viaje IA</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAsistenteIA(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed">
                Analizamos el pronóstico en París (16-19°C con probabilidad de lluvia ligera) y tu maleta de 18 piezas:
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-zinc-50 border border-zinc-100 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-zinc-900">Capas inteligentes</p>
                    <p className="text-zinc-500 text-[11px] mt-0.5">
                      Usa la gabardina con el suéter crudo por la mañana y quítate una capa hacia el mediodía.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-100 flex items-start gap-2.5">
                  <Luggage className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-zinc-900">Cero sobrepeso</p>
                    <p className="text-zinc-500 text-[11px] mt-0.5">
                      Tus 2 opciones de calzado cubren tanto caminatas de 12k pasos como cenas formales.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setModalAsistenteIA(false)}
                  className="h-9 px-5 bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

