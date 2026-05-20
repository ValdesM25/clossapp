"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, type Variants, useMotionValue, useSpring } from "framer-motion"
import {
  Home, Shirt, Sparkles, ShoppingBag, BarChart3,
  Plus, Search, AlertCircle, TrendingUp, Clock, Check, Loader2, X, Lock, Tag,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Prenda } from "@/lib/supabase"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"

// SSR-aware browser client — carries the session cookie on every request
const supabase = createBrowserSupabaseClient()

// ─── AUTH ─────────────────────────────────────────────────────────────────────
type UserMode = "VIP" | "GUEST"

// ─── DEMO TOGGLE ──────────────────────────────────────────────────────────────
const IS_OFFLINE_DEMO = false

type OutfitRec = { titulo: string; descripcion: string; prendas_usadas: string[] }
type ReparacionDB = {
  id: string; user_id: string; prenda_id: string | null; prenda: string
  tarea: string; prioridad: "Baja" | "Media" | "Alta"; completado: boolean; created_at: string
}
type View = "inicio" | "armario" | "simulador" | "marketplace" | "estadisticas"

const DEMO_OUTFITS: OutfitRec[] = [
  { titulo: "Boho Citadino", descripcion: "Jeans rectos con top de lino y sandalias planas.", prendas_usadas: ["Jeans rectos", "Top de lino", "Sandalias"] },
  { titulo: "Business Chic", descripcion: "Blazer estructurado con pantalón de pinzas y mocasines.", prendas_usadas: ["Blazer", "Pantalón de pinzas", "Mocasines"] },
  { titulo: "Gala Nocturna", descripcion: "Vestido satinado midi con abrigo ligero y tacones.", prendas_usadas: ["Vestido satinado", "Abrigo ligero", "Tacones"] },
]

const GUEST_PRENDAS: Prenda[] = [
  { id: "g1", user_id: "guest", name: "Camisa Blanca", category: "Tops", image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80", created_at: "" },
  { id: "g2", user_id: "guest", name: "Jeans Azul", category: "Pantalones", image_url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80", created_at: "" },
  { id: "g3", user_id: "guest", name: "Blazer Negro", category: "Chaquetas", image_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80", created_at: "" },
  { id: "g4", user_id: "guest", name: "Vestido Floral", category: "Vestidos", image_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80", created_at: "" },
  { id: "g5", user_id: "guest", name: "Sneakers Blancos", category: "Zapatos", image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80", created_at: "" },
  { id: "g6", user_id: "guest", name: "Bolso Tote", category: "Accesorios", image_url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80", created_at: "" },
]
const GUEST_REPARACIONES: ReparacionDB[] = [
  { id: "r1", user_id: "guest", prenda_id: null, prenda: "Abrigo beige", tarea: "Cambiar botón", prioridad: "Alta", completado: false, created_at: "" },
  { id: "r2", user_id: "guest", prenda_id: null, prenda: "Pantalón negro", tarea: "Ajustar dobladillo", prioridad: "Media", completado: false, created_at: "" },
]

// Static marketplace fallback items
const STATIC_MARKET: Prenda[] = [
  { id: "m1", user_id: "market", name: "Bufanda Lino", category: "Accesorios", image_url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80", talla: "Única", estado_uso: "Como nuevo", precio: 80, en_venta: true, created_at: "" },
  { id: "m2", user_id: "market", name: "Zapatillas Blancas", category: "Zapatos", image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80", talla: "38", estado_uso: "Poco uso", precio: 500, en_venta: true, created_at: "" },
  { id: "m3", user_id: "market", name: "Bolso Tote Cuero", category: "Accesorios", image_url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80", talla: "Única", estado_uso: "Como nuevo", precio: 850, en_venta: true, created_at: "" },
  { id: "m4", user_id: "market", name: "Vestido Verano", category: "Ropa", image_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80", talla: "S", estado_uso: "Nuevo con etiqueta", precio: 320, en_venta: true, created_at: "" },
]

const navItems = [
  { id: "inicio" as View, label: "Inicio", icon: Home },
  { id: "armario" as View, label: "Armario", icon: Shirt },
  { id: "simulador" as View, label: "Outfit", icon: Sparkles },
  { id: "marketplace" as View, label: "Shop", icon: ShoppingBag },
  { id: "estadisticas" as View, label: "Stats", icon: BarChart3 },
]

const fashionImages = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80",
  "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&q=80",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80",
]
const outfitImages = [
  "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=600&q=80",
  "https://images.unsplash.com/photo-1594938298603-c8148c4b4e5b?w=600&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
]

const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
}
const pageProps = { variants: pageVariants, initial: "initial" as const, animate: "animate" as const, exit: "exit" as const }

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function useKeyboardOpen() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const handler = () => setOpen(vv.height < window.innerHeight * 0.75)
    vv.addEventListener("resize", handler)
    return () => vv.removeEventListener("resize", handler)
  }, [])
  return open
}

async function fetchPrendas(userId: string): Promise<Prenda[]> {
  const { data, error } = await supabase
    .from("prendas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}







async function resizeImage(file: File, maxWidth = 1000, quality = 0.85): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement("canvas")
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => resolve(b!), "image/jpeg", quality)
    }
    img.src = url
  })
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function PrendaSkeleton() {
  return (
    <div className="columns-2 gap-3 space-y-3">
      {[180, 140, 160, 180, 140, 160].map((h, i) => (
        <div key={i} className="break-inside-avoid overflow-hidden bg-zinc-100 mb-3 animate-pulse">
          <div className="bg-zinc-200" style={{ height: h }} />
          <div className="p-3 space-y-1.5">
            <div className="h-3 bg-zinc-200 rounded w-3/4" />
            <div className="h-2.5 bg-zinc-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── SHARED: CENTERED MODAL ───────────────────────────────────────────────────
function CenteredModal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }} transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="w-full max-w-lg bg-white rounded-none shadow-2xl relative max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border border-zinc-200 hover:bg-zinc-50 z-10">
              <X className="w-4 h-4 text-zinc-600" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── VIEW: LOGIN ──────────────────────────────────────────────────────────────
// LoginView now passes both the UUID (for DB queries) and display name (for UI)
function LoginView({ onLogin }: { onLogin: (mode: UserMode, uuid: string, displayName: string) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabaseClient = createBrowserSupabaseClient()

  async function handleEnter() {
    if (!email.trim() || !password.trim()) return
    setLoading(true); setError(null)
    try {
      const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })
      if (authError || !data.user) {
        setError("Código no reconocido. Intenta de nuevo.")
        return
      }
      // uuid = data.user.id (the real UUID Supabase uses for RLS)
      // displayName = email prefix, only used for the greeting in the UI
      const uuid = data.user.id
      const displayName = data.user.email?.split("@")[0] ?? email.trim()
      onLogin("VIP", uuid, displayName)
    } catch {
      setError("Código no reconocido. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen bg-white flex flex-col items-center justify-center px-8 gap-10">
      <div className="text-center">
        <h1 className="font-serif text-4xl tracking-tight text-zinc-900">Clossapp</h1>
        <p className="text-xs text-zinc-400 mt-2 tracking-widest uppercase">Tu armario digital</p>
      </div>
      <div className="w-full flex flex-col gap-3">
        <label className="text-xs text-zinc-500 uppercase tracking-widest text-center block">Correo electrónico</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEnter()}
          placeholder="tu@correo.com" type="email"
          className="h-12 rounded-none border-zinc-900 text-center text-base tracking-widest focus-visible:ring-0 focus-visible:border-zinc-900" />
        <label className="text-xs text-zinc-500 uppercase tracking-widest text-center block">Contraseña</label>
        <Input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEnter()}
          placeholder="••••••••" type="password"
          className="h-12 rounded-none border-zinc-900 text-center text-base tracking-widest focus-visible:ring-0 focus-visible:border-zinc-900" />
        {error && <p className="text-xs text-zinc-500 text-center">{error}</p>}
        <motion.button whileTap={{ scale: 0.98 }} onClick={handleEnter} disabled={loading}
          className="w-full h-12 bg-zinc-900 text-white text-sm font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
        </motion.button>
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => onLogin("GUEST", "guest", "Invitada")}
          className="w-full h-12 border border-zinc-300 text-zinc-600 text-sm tracking-wide">
          Explorar como invitada
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─── VIEW: INICIO ─────────────────────────────────────────────────────────────
function InicioView({ userName, isGuest }: { userName: string; isGuest: boolean }) {
  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-32 px-4 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Bienvenida</p>
          <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">{userName}</h1>
          {isGuest && <span className="text-[10px] text-zinc-400 uppercase tracking-widest border border-zinc-200 px-2 py-0.5">Solo lectura</span>}
        </div>
        <div className="w-10 h-10 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80" alt="avatar" className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="relative h-56 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80" alt="hero" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-5">
          <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Tu armario inteligente</p>
          <h2 className="font-serif text-white text-xl">Estilo personalizado con IA</h2>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-lg text-zinc-900">Cómo funciona</h2>
        {[
          { n: "01", title: "Digitaliza", desc: "Fotografía tus prendas y organiza tu guardarropa." },
          { n: "02", title: "Organiza", desc: "Categoriza por ocasión, temporada y estado." },
          { n: "03", title: "Descubre", desc: "La IA sugiere outfits según el clima y tu agenda." },
        ].map((s) => (
          <div key={s.n} className="flex gap-4 border-b border-zinc-100 pb-3">
            <span className="text-xs text-zinc-400 font-mono pt-0.5 w-6 shrink-0">{s.n}</span>
            <div>
              <p className="text-sm font-medium text-zinc-900">{s.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-lg text-zinc-900">Planes</h2>
        {[
          { name: "Esencial", price: "$0", desc: "Para empezar", features: ["Outfits básicos", "Hasta 50 prendas"] },
          { name: "Plus", price: "$59 MXN/mes", desc: "Para entusiastas", features: ["IA ilimitada", "Prendas ilimitadas", "Estadísticas"], highlight: true },
          { name: "Elite", price: "$89 MXN/mes", desc: "Para profesionales", features: ["IA avanzada", "Tendencias", "Soporte prioritario"] },
        ].map((plan) => (
          <div key={plan.name} className={cn("border p-5", plan.highlight ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200")}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className={cn("font-serif text-base", plan.highlight ? "text-white" : "text-zinc-900")}>{plan.name}</p>
                <p className={cn("text-xs", plan.highlight ? "text-zinc-400" : "text-zinc-500")}>{plan.desc}</p>
              </div>
              <p className={cn("font-serif text-lg", plan.highlight ? "text-white" : "text-zinc-900")}>{plan.price}</p>
            </div>
            {plan.features.map((f) => (
              <div key={f} className="flex items-center gap-2 mb-1">
                <Check className={cn("w-3 h-3", plan.highlight ? "text-zinc-400" : "text-zinc-400")} />
                <span className={cn("text-xs", plan.highlight ? "text-zinc-300" : "text-zinc-600")}>{f}</span>
              </div>
            ))}
            <motion.button whileTap={{ scale: 0.98 }}
              className={cn("w-full mt-4 py-2.5 text-sm font-medium tracking-wide", plan.highlight ? "bg-white text-zinc-900" : "border border-zinc-900 text-zinc-900")}>
              {plan.name === "Esencial" ? "Comenzar gratis" : `Elegir ${plan.name}`}
            </motion.button>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── VIEW: ARMARIO ────────────────────────────────────────────────────────────
function ArmarioView({ userId, isGuest }: { userId: string; isGuest: boolean }) {
  const [prendas, setPrendas] = useState<Prenda[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null)
  const [previewForm, setPreviewForm] = useState({
    nombre: "", categoria: "", color_principal: "", estilo: "", descripcion: "",
    talla: "", estado_uso: "",
  })
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [reparaciones, setReparaciones] = useState<ReparacionDB[]>([])
  const [loadingRep, setLoadingRep] = useState(true)
  const [showRepForm, setShowRepForm] = useState(false)
  const [repForm, setRepForm] = useState({ prenda_id: null as string | null, tarea: "", prioridad: "Media" as ReparacionDB["prioridad"] })
  const [savingRep, setSavingRep] = useState(false)
  const [selectedPrenda, setSelectedPrenda] = useState<Prenda | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeCategory, setActiveCategory] = useState("Todas")
  const prendasConRep = new Set(reparaciones.map((r) => r.prenda_id).filter(Boolean))

  // Derive unique categories from loaded prendas + fixed defaults
  const FIXED_CATS = ["Todas", "Top", "Bottom", "Outerwear", "Calzado", "Accesorio", "Vestido"]
  const dynamicCats = Array.from(new Set(prendas.map((p) => p.category).filter(Boolean)))
  const allCats = Array.from(new Set([...FIXED_CATS, ...dynamicCats]))

  const prendasFiltradas = activeCategory === "Todas"
    ? prendas
    : prendas.filter((p) =>
        p.category?.toLowerCase().includes(activeCategory.toLowerCase()) ||
        (p.metadata as Record<string, string> | null)?.categoria?.toLowerCase().includes(activeCategory.toLowerCase())
      )

  useEffect(() => {
    if (isGuest) { setPrendas(GUEST_PRENDAS); setLoading(false); return }
    fetchPrendas(userId).then(setPrendas).catch(console.error).finally(() => setLoading(false))
  }, [userId, isGuest])

  useEffect(() => {
    if (isGuest) { setReparaciones(GUEST_REPARACIONES); setLoadingRep(false); return }
    supabase.from("reparaciones").select("*").eq("user_id", userId).eq("completado", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setReparaciones(data ?? []); setLoadingRep(false) })
  }, [userId, isGuest])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isGuest) return
    const file = e.target.files?.[0]
    if (!file) return
    setPreview({ url: URL.createObjectURL(file), file })
    setPreviewForm({ nombre: "", categoria: "", color_principal: "", estilo: "", descripcion: "", talla: "", estado_uso: "" })
    setAnalyzeError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    // Kick off AI analysis immediately
    analyzeImage(file, userId)
  }

  async function analyzeImage(file: File, userId: string) {
    setAnalyzing(true)
    try {
      // Compress to max 800px / JPEG 0.7 before sending — avoids Vercel 4.5MB payload limit
      const compressed = await resizeImage(file, 800, 0.7)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(",")[1])
        reader.onerror = reject
        reader.readAsDataURL(compressed)
      })
      const mediaType = "image/jpeg"

      const res = await fetch("/api/analyze-prenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType, user_id: userId }),
      })
      if (!res.ok) throw new Error("Error al analizar")
      const data = await res.json()
      setPreviewForm((f) => ({
        ...f,
        nombre: data.nombre ?? "",
        categoria: data.categoria ?? "",
        color_principal: data.color_principal ?? "",
        estilo: data.estilo ?? "",
        descripcion: data.descripcion ?? "",
      }))
    } catch (err) {
      console.error("[analyzeImage]", err)
      setAnalyzeError("No se pudo analizar la imagen. Puedes completar los campos manualmente.")
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleConfirmUpload() {
    if (!preview) return
    setUploading(true)
    try {    
      const blob = await resizeImage(preview.file)
      const path = `${userId}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from("closet-images").upload(path, blob, { contentType: "image/jpeg" })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from("closet-images").getPublicUrl(path)
      const metadata = {
        nombre: previewForm.nombre,
        categoria: previewForm.categoria,
        color_principal: previewForm.color_principal,
        estilo: previewForm.estilo,
        descripcion: previewForm.descripcion,
      }
      const { error: insertError } = await supabase.from("prendas").insert({
        user_id: userId,
        name: previewForm.nombre || preview.file.name.replace(/\.[^/.]+$/, ""),
        category: previewForm.categoria || "Sin categoría",
        image_url: urlData.publicUrl,
        talla: previewForm.talla || null,
        estado_uso: previewForm.estado_uso || null,
        description: previewForm.descripcion || null,
        color: previewForm.color_principal || null,
        style: previewForm.estilo || null,
        metadata,
      })
      if (insertError) throw insertError
      const updated = await fetchPrendas(userId)
      setPrendas(updated)
    } catch (err) { console.error("Error subiendo prenda:", err) }
    finally {
      setUploading(false)
      URL.revokeObjectURL(preview.url)
      setPreview(null)
    }
  }

  async function handleSaveRep() {
    if (isGuest || !repForm.prenda_id) return
    setSavingRep(true)
    const selectedPrenda = prendas.find((p) => p.id === repForm.prenda_id)
    const payload = { user_id: userId, prenda_id: repForm.prenda_id, prenda: selectedPrenda?.name ?? "", tarea: repForm.tarea, prioridad: repForm.prioridad, completado: false }
    console.log("[handleSaveRep] payload →", JSON.stringify(payload, null, 2))
    const { data, error } = await supabase.from("reparaciones").insert(payload).select().single()
    if (error) {
      console.error("[handleSaveRep] error →", error.message, error.details, error.hint)
    } else if (data) {
      const { data: updated } = await supabase.from("reparaciones").select("*").eq("user_id", userId).eq("completado", false).order("created_at", { ascending: false })
      setReparaciones(updated ?? [])
    }
    setRepForm({ prenda_id: null, tarea: "", prioridad: "Media" })
    setShowRepForm(false)
    setSavingRep(false)
  }

  async function handleCompleteRep(id: string) {
    if (isGuest) return
    await supabase.from("reparaciones").update({ completado: true }).eq("id", id)
    setReparaciones((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-40 pt-8">
      <div className="px-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Mi Colección</p>
          <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">Armario Digital</h1>
        </div>
        {/* Category filter — right side */}
        <Select value={activeCategory} onValueChange={setActiveCategory}>
          <SelectTrigger className="w-auto h-8 rounded-none border-zinc-300 text-xs text-zinc-600 focus:ring-0 gap-1 pr-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[60]">
            {allCats.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Upload preview modal — AI auto-fill */}
      <CenteredModal open={!!preview} onClose={() => { if (preview) URL.revokeObjectURL(preview.url); setPreview(null) }}>
        <div className="p-6 flex flex-col gap-4">
          <p className="font-serif text-zinc-900 text-lg pr-8">Nueva prenda</p>

          {preview && <img src={preview.url} alt="preview" className="w-full object-cover max-h-52" />}

          {/* Step 2: analyzing state */}
          {analyzing && (
            <div className="flex items-center gap-3 border border-zinc-100 px-4 py-3">
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />
              <p className="text-xs text-zinc-500 tracking-wide">Analizando prenda...</p>
            </div>
          )}

          {analyzeError && (
            <p className="text-xs text-zinc-400 border border-zinc-100 px-4 py-3">{analyzeError}</p>
          )}

          {/* Step 3: AI-filled fields (editable) */}
          {!analyzing && (
            <>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Nombre</label>
                <Input value={previewForm.nombre}
                  onChange={(e) => setPreviewForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. Blazer de Lino Negro"
                  className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Categoría</label>
                  <Input value={previewForm.categoria}
                    onChange={(e) => setPreviewForm(f => ({ ...f, categoria: e.target.value }))}
                    placeholder="Top, Bottom..."
                    className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Color</label>
                  <Input value={previewForm.color_principal}
                    onChange={(e) => setPreviewForm(f => ({ ...f, color_principal: e.target.value }))}
                    placeholder="Negro, Beige..."
                    className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Estilo</label>
                <Input value={previewForm.estilo}
                  onChange={(e) => setPreviewForm(f => ({ ...f, estilo: e.target.value }))}
                  placeholder="Minimalista, Casual..."
                  className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
              </div>

              {/* Step 4: manual fields */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-100">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Talla</label>
                  <Input value={previewForm.talla}
                    onChange={(e) => setPreviewForm(f => ({ ...f, talla: e.target.value }))}
                    placeholder="XS, S, M, 38..."
                    className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Estado</label>
                  <Select value={previewForm.estado_uso} onValueChange={(v) => setPreviewForm(f => ({ ...f, estado_uso: v }))}>
                    <SelectTrigger className="rounded-none border-zinc-300 focus:ring-0 text-sm h-10"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent className="z-[110]">
                      <SelectItem value="Nuevo con etiqueta">Nuevo con etiqueta</SelectItem>
                      <SelectItem value="Como nuevo">Como nuevo</SelectItem>
                      <SelectItem value="Poco uso">Poco uso</SelectItem>
                      <SelectItem value="Buen estado">Buen estado</SelectItem>
                      <SelectItem value="Usado">Usado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <motion.button whileTap={{ scale: 0.98 }} onClick={handleConfirmUpload}
            disabled={uploading || analyzing}
            className="w-full py-3 bg-zinc-900 text-white text-sm font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {uploading ? "Guardando..." : "Confirmar y Guardar"}
          </motion.button>
        </div>
      </CenteredModal>

      {/* Repair form modal */}
      <CenteredModal open={showRepForm} onClose={() => setShowRepForm(false)}>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pr-8">
            <p className="font-serif text-zinc-900 text-lg">Nueva reparación</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleSaveRep} disabled={savingRep || !repForm.prenda_id}
              className="px-4 py-1.5 bg-zinc-900 text-white text-xs font-medium tracking-wide disabled:opacity-40 flex items-center gap-1.5">
              {savingRep ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Guardar
            </motion.button>
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">Selecciona la prenda</label>
            {prendas.length === 0 ? (
              <p className="text-xs text-zinc-400 border border-zinc-100 p-4 text-center">Sube prendas primero.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {prendas.map((p) => (
                  <button key={p.id} onClick={() => setRepForm(f => ({ ...f, prenda_id: p.id }))}
                    className={cn("relative overflow-hidden border-2 transition-all", repForm.prenda_id === p.id ? "border-zinc-900" : "border-transparent")}>
                    <img src={p.image_url} alt={p.name} className="w-full h-20 object-cover" />
                    {repForm.prenda_id === p.id && (
                      <div className="absolute inset-0 bg-zinc-900/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-600 truncate px-1 py-1 bg-white">{p.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">Tarea</label>
            <Input value={repForm.tarea} onChange={(e) => setRepForm(f => ({ ...f, tarea: e.target.value }))}
              placeholder="Ej. Cambiar botón, ajustar dobladillo..."
              className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">Prioridad</label>
            <Select value={repForm.prioridad} onValueChange={(v) => setRepForm(f => ({ ...f, prioridad: v as ReparacionDB["prioridad"] }))}>
              <SelectTrigger className="rounded-none border-zinc-300 focus:ring-0"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[110]">
                <SelectItem value="Baja">Baja</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CenteredModal>

      {/* Prendas grid */}
      <section className="px-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Mis Prendas</p>
        {loading ? <PrendaSkeleton /> : prendas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 border border-zinc-100">
            <Shirt className="w-8 h-8 text-zinc-300" />
            <div className="text-center">
              <p className="text-sm text-zinc-700">Tu clóset está vacío</p>
              <p className="text-xs text-zinc-400 mt-1">Sube tu primer look</p>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => fileInputRef.current?.click()}
              className="border border-zinc-900 text-zinc-900 text-xs px-5 py-2 tracking-wide">
              + Agregar prenda
            </motion.button>
          </div>
        ) : (
          <div className="columns-2 gap-3 space-y-3">
            {prendasFiltradas.map((item, i) => {
              const tieneRep = prendasConRep.has(item.id)
              return (
                <div key={item.id} onClick={() => setSelectedPrenda(item)}
                  className={cn(
                    "break-inside-avoid relative overflow-hidden mb-3 cursor-pointer active:opacity-80 transition-opacity",
                    item.en_renta ? "bg-zinc-200 opacity-60" : "bg-zinc-50"
                  )}>
                  <img src={item.image_url || fashionImages[i % fashionImages.length]} alt={item.name}
                    className={cn("w-full object-cover", item.en_renta && "grayscale")}
                    style={{ height: i % 3 === 0 ? "180px" : i % 3 === 1 ? "140px" : "160px" }} />
                  {tieneRep && (
                    <div className="absolute top-2 right-2 bg-white border border-zinc-200 text-zinc-600 text-[10px] font-medium px-2 py-0.5 flex items-center gap-1">
                      Rep.
                    </div>
                  )}
                  {item.en_renta && (
                    <div className="absolute top-2 left-2 bg-zinc-500 text-white text-[10px] font-medium px-2 py-0.5">
                      En renta
                    </div>
                  )}
                  {item.en_venta && !item.en_renta && (
                    <div className="absolute top-2 left-2 bg-zinc-900 text-white text-[10px] font-medium px-2 py-0.5">
                      En venta
                    </div>
                  )}
                  <div className="p-2.5">
                    <p className={cn("text-xs font-medium truncate", item.en_renta ? "text-zinc-400" : "text-zinc-900")}>{item.name}</p>
                    <p className="text-[10px] text-zinc-400">{item.category}{item.talla ? ` · ${item.talla}` : ""}</p>
                    {item.en_renta && item.fecha_renta && (
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Renta: {new Date(item.fecha_renta).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Prenda Detail Modal */}
      <CenteredModal open={!!selectedPrenda} onClose={() => setSelectedPrenda(null)}>
        {selectedPrenda && (() => {
          const m = selectedPrenda.metadata ?? {}
          const chips = [m.estilo, m.material, m.color_principal].filter(Boolean)
          return (
            <div className="flex flex-col">
              <img
                src={selectedPrenda.image_url}
                alt={selectedPrenda.name}
                className="w-full object-cover"
                style={{ maxHeight: "320px" }}
              />
              <div className="p-5 flex flex-col gap-4">
                {/* Nombre con tipografía serif */}
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">{selectedPrenda.category}</p>
                  <h2 className="font-serif text-xl text-zinc-900 leading-tight">
                    {m.nombre || selectedPrenda.name}
                  </h2>
                </div>

                {/* Chips de atributos */}
                {chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <span key={chip} className="bg-zinc-900 text-white text-[10px] font-medium px-2.5 py-1 tracking-wide uppercase">
                        {chip}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ficha técnica */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-100 pt-4">
                  {m.descripcion && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Descripción</p>
                      <p className="text-xs text-zinc-700 leading-relaxed">{m.descripcion}</p>
                    </div>
                  )}
                  {selectedPrenda.talla && (
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Talla</p>
                      <p className="text-sm font-medium text-zinc-900">{selectedPrenda.talla}</p>
                    </div>
                  )}
                  {selectedPrenda.estado_uso && (
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Estado</p>
                      <p className="text-sm font-medium text-zinc-900">{selectedPrenda.estado_uso}</p>
                    </div>
                  )}
                  {selectedPrenda.en_venta && selectedPrenda.precio && (
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Precio</p>
                      <p className="font-serif text-lg text-zinc-900">${selectedPrenda.precio}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </CenteredModal>

      {/* Reparaciones */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Reparaciones</p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => !isGuest && setShowRepForm(true)}
            className={cn("text-xs px-3 py-1.5 flex items-center gap-1 tracking-wide",
              isGuest ? "border border-zinc-200 text-zinc-300 cursor-default" : "border border-zinc-900 text-zinc-900")}>
            {isGuest ? <Lock className="w-3 h-3" /> : <Plus className="w-3 h-3" />} Nueva
          </motion.button>
        </div>
        <div className="flex flex-col gap-2">
          {loadingRep ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-zinc-400 animate-spin" /></div>
          ) : (
            <AnimatePresence>
              {reparaciones.length === 0 ? (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-zinc-400 text-center py-4">
                  Sin reparaciones pendientes
                </motion.p>
              ) : reparaciones.map((rep) => {
                const prenda = prendas.find((p) => p.id === rep.prenda_id)
                return (
                  <motion.div key={rep.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                    className="flex items-center gap-3 border border-zinc-100 p-3">
                    {prenda?.image_url
                      ? <img src={prenda.image_url} alt={prenda.name} className="w-10 h-10 object-cover shrink-0" />
                      : <div className="w-10 h-10 bg-zinc-100 flex items-center justify-center shrink-0"><Shirt className="w-4 h-4 text-zinc-300" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-900 truncate">{rep.prenda}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{rep.tarea}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-[10px] px-2 py-0.5 border",
                        rep.prioridad === "Alta" ? "border-zinc-900 text-zinc-900" :
                          rep.prioridad === "Media" ? "border-zinc-400 text-zinc-500" : "border-zinc-200 text-zinc-400")}>
                        {rep.prioridad}
                      </span>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleCompleteRep(rep.id)}
                        className="w-7 h-7 border border-zinc-200 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-zinc-500" />
                      </motion.button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </section>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      <motion.button whileTap={{ scale: 0.94 }} onClick={() => !isGuest && fileInputRef.current?.click()} disabled={uploading}
        className={cn("fixed bottom-28 z-40 shadow-lg w-12 h-12 flex items-center justify-center fab-right",
          isGuest ? "bg-zinc-200 cursor-default" : "bg-zinc-900 text-white disabled:opacity-50")}>
        {uploading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : isGuest ? <Lock className="w-4 h-4 text-zinc-400" /> : <Plus className="w-5 h-5 text-white" />}
      </motion.button>
    </motion.div>
  )
}

// ─── USAGE TRACKING ───────────────────────────────────────────────────────────
// Only called when user explicitly confirms an outfit — NOT on generation
async function registrarUso(prendaIds: string[]) {
  if (!prendaIds.length) return
  const now = new Date().toISOString()
  await Promise.all(
    prendaIds.map((id) =>
      supabase.from("prendas").update({ ultimo_uso: now }).eq("id", id)
        .then(() =>
          // Increment usos via raw SQL increment — safe without RPC
          supabase.rpc("incrementar_uso", { prenda_id_input: id })
        )
    )
  )
}

// ─── VIEW: SIMULADOR ──────────────────────────────────────────────────────────
// ─── OUTFIT CATEGORY LAYERS ───────────────────────────────────────────────────
const LAYER_ORDER = ["Outerwear", "Top", "Bottom", "Calzado", "Accesorio"]

function OutfitVisual({ outfitPrendas }: { outfitPrendas: Prenda[] }) {
  const layers = LAYER_ORDER.map((cat) => ({
    cat,
    items: outfitPrendas.filter((p) =>
      p.category?.toLowerCase().includes(cat.toLowerCase()) ||
      (p.metadata as Record<string, string> | null | undefined)?.categoria?.toLowerCase().includes(cat.toLowerCase())
    ),
  })).filter((l) => l.items.length > 0)

  // Fallback: show all if no category matches
  const display = layers.length > 0 ? layers : [{ cat: "Prendas", items: outfitPrendas }]

  return (
    <div className="flex flex-col gap-2">
      {display.map(({ cat, items }) => (
        <div key={cat}>
          <p className="text-[9px] text-zinc-400 uppercase tracking-widest mb-1">{cat}</p>
          <div className="flex gap-2 flex-wrap">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 border border-zinc-100 px-2 py-1">
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className="w-8 h-8 object-cover shrink-0" />
                )}
                <span className="text-[10px] text-zinc-700 leading-tight max-w-[80px]">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── VIEW: SIMULADOR ──────────────────────────────────────────────────────────
function SimuladorView({ prendas, isGuest, onElegir, userId, userName }: {
  prendas: Prenda[]
  isGuest: boolean
  onElegir: () => void
  userId: string    // UUID — for AI endpoint guard
  userName: string  // email prefix — for incrementar_outfits RPC
}) {
  const [ocasion, setOcasion] = useState("")
  const [clima, setClima] = useState("")
  const [destacada, setDestacada] = useState("")
  const [destacadaQuery, setDestacadaQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [outfits, setOutfits] = useState<Array<{ titulo: string; descripcion: string; prenda_ids: string[] }>>([])
  const [generating, setGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [eligiendoIdx, setEligiendoIdx] = useState<number | null>(null)
  const [elegidoIdx, setElegidoIdx] = useState<number | null>(null)

  const suggestions = destacadaQuery.length > 0
    ? prendas.filter((p) => p.name.toLowerCase().includes(destacadaQuery.toLowerCase())).slice(0, 5)
    : []

  async function handleGenerate() {
    setGenerating(true); setErrorMsg(null); setOutfits([])
    try {
      if (isGuest || IS_OFFLINE_DEMO) {
        await new Promise((r) => setTimeout(r, 1500))
        setOutfits(DEMO_OUTFITS.map((o) => ({
          titulo: o.titulo,
          descripcion: o.descripcion,
          prenda_ids: prendas.slice(0, 3).map((p) => p.id),
        })))
        return
      }
      const contexto = [
        ocasion && `Ocasión: ${ocasion}`,
        clima && `Clima: ${clima}`,
        destacada && `Prenda destacada: ${destacada}`,
      ].filter(Boolean).join(". ") || "Outfit casual del día"

      const wardrobe = prendas.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        metadata: p.metadata ?? null,
      }))

      const res = await fetch("/api/generate-outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contexto, wardrobe, user_id: userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error en la API")
      setOutfits(data.outfits ?? [])
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al generar. Intenta de nuevo.")
    } finally { setGenerating(false) }
  }

  async function handleElegir(outfit: { titulo: string; prenda_ids: string[] }, idx: number) {
    if (isGuest) return
    setEligiendoIdx(idx)
    await Promise.all([
      registrarUso(outfit.prenda_ids),
      // Increment outfits_creados in usuarios_permitidos
      supabase.rpc("incrementar_outfits", { username_input: userName }).then(({ error }) => {
        if (error) {
          // Fallback: manual increment if RPC not available
          supabase.from("usuarios_permitidos")
            .select("outfits_creados").eq("username", userName).single()
            .then(({ data }) =>
              supabase.from("usuarios_permitidos")
                .update({ outfits_creados: (data?.outfits_creados ?? 0) + 1 })
                .eq("username", userName)
            )
        }
      }),
    ])
    setEligiendoIdx(null)
    setElegidoIdx(idx)
    setTimeout(() => { setElegidoIdx(null); onElegir() }, 2000)
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-32 pt-8">
      <div className="px-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest">IA Stylist</p>
        <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">Simulador de Outfit</h1>
      </div>

      {/* Form */}
      <div className="mx-4 border border-zinc-200 p-5 flex flex-col gap-4">
        {/* Ocasión */}
        <div>
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1.5 block">Ocasión</label>
          <div className="flex flex-wrap gap-2">
            {["Casual", "Oficina", "Cena", "Formal", "Deporte"].map((o) => (
              <button key={o} onClick={() => setOcasion(o === ocasion ? "" : o)}
                className={cn("text-xs px-3 py-1.5 border tracking-wide transition-colors",
                  ocasion === o ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600")}>
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Clima */}
        <div>
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1.5 block">Clima</label>
          <div className="flex flex-wrap gap-2">
            {["Frío", "Templado", "Calor", "Lluvia"].map((c) => (
              <button key={c} onClick={() => setClima(c === clima ? "" : c)}
                className={cn("text-xs px-3 py-1.5 border tracking-wide transition-colors",
                  clima === c ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600")}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Prenda destacada — autocomplete */}
        <div className="relative">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1.5 block">
            Prenda a destacar (opcional)
          </label>
          <Input
            value={destacadaQuery}
            onChange={(e) => { setDestacadaQuery(e.target.value); setDestacada(e.target.value); setShowSuggestions(true) }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Busca una prenda..."
            className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 border-t-0 z-20 shadow-sm">
              {suggestions.map((p) => (
                <button key={p.id} onMouseDown={() => { setDestacada(p.name); setDestacadaQuery(p.name); setShowSuggestions(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 text-left">
                  {p.image_url && <img src={p.image_url} alt={p.name} className="w-7 h-7 object-cover shrink-0" />}
                  <span className="text-xs text-zinc-700">{p.name}</span>
                  <span className="text-[10px] text-zinc-400 ml-auto">{p.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {errorMsg && <p className="text-xs text-zinc-500">{errorMsg}</p>}

        <motion.button whileTap={{ scale: 0.98 }} onClick={handleGenerate}
          disabled={generating || isGuest || (!isGuest && prendas.length === 0)}
          className={cn(
            "w-full py-3 text-sm font-medium tracking-widest uppercase flex items-center justify-center gap-2",
            isGuest
              ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
              : "bg-zinc-900 text-white disabled:opacity-40"
          )}>
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" />Diseñando propuestas...</>
            : isGuest
              ? <><Lock className="w-3.5 h-3.5" />Inicia sesión para usar IA</>
              : "Generar Propuestas"}
        </motion.button>

        {!isGuest && prendas.length === 0 && (
          <p className="text-[10px] text-zinc-400 text-center">Sube prendas a tu armario primero</p>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {outfits.length > 0 && (
          <section className="px-4 flex flex-col gap-6">
            <p className="text-xs text-zinc-400 uppercase tracking-widest">Propuestas</p>
            {outfits.map((outfit, i) => {
              // Normalize both sides to trimmed strings to handle int/string mismatch from Claude
              const normalizedIds = outfit.prenda_ids.map((id) => String(id).trim())
              const outfitPrendas = prendas.filter((p) => normalizedIds.includes(String(p.id).trim()))
              const isElegido = elegidoIdx === i
              const isEligiendo = eligiendoIdx === i

              return (
                <OutfitCard
                  key={i}
                  index={i}
                  outfit={outfit}
                  outfitPrendas={outfitPrendas}
                  isElegido={isElegido}
                  isEligiendo={isEligiendo}
                  isGuest={isGuest}
                  onElegir={() => handleElegir(outfit, i)}
                />
              )
            })}
          </section>
        )}
      </AnimatePresence>

      {outfits.length === 0 && !generating && (
        <div className="mx-4 flex flex-col items-center justify-center py-12 gap-2 border border-zinc-100">
          <Sparkles className="w-5 h-5 text-zinc-300" />
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Configura y genera propuestas</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── OUTFIT CARD ──────────────────────────────────────────────────────────────
function OutfitCard({
  index, outfit, outfitPrendas, isElegido, isEligiendo, isGuest, onElegir,
}: {
  index: number
  outfit: { titulo: string; descripcion: string; prenda_ids: string[] }
  outfitPrendas: Prenda[]
  isElegido: boolean
  isEligiendo: boolean
  isGuest: boolean
  onElegir: () => void
}) {
  const [showDesc, setShowDesc] = useState(false)

  // Split prendas into visual layers for the photo grid
  const tops = outfitPrendas.filter((p) => ["top", "outerwear"].some((k) => p.category?.toLowerCase().includes(k) || (p.metadata as Record<string, string> | null)?.categoria?.toLowerCase().includes(k)))
  const bottoms = outfitPrendas.filter((p) => ["bottom", "calzado"].some((k) => p.category?.toLowerCase().includes(k) || (p.metadata as Record<string, string> | null)?.categoria?.toLowerCase().includes(k)))
  const accesorios = outfitPrendas.filter((p) => ["accesorio"].some((k) => p.category?.toLowerCase().includes(k) || (p.metadata as Record<string, string> | null)?.categoria?.toLowerCase().includes(k)))
  // Fallback: if no layer matched, show all
  const hasLayers = tops.length + bottoms.length + accesorios.length > 0
  const allPhotos = hasLayers ? [...tops, ...bottoms, ...accesorios] : outfitPrendas

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: index * 0.08 } }}
      className="border border-zinc-200 flex flex-col">

      {/* ARRIBA: Photo grid — visual first */}
      {allPhotos.length > 0 ? (
        <div className="grid grid-cols-3 gap-px bg-zinc-100">
          {allPhotos.map((p) => (
            <div key={p.id} className="relative bg-white aspect-square overflow-hidden">
              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              {/* Layer label */}
              <span className="absolute bottom-0 left-0 right-0 text-[8px] text-white bg-black/40 text-center py-0.5 uppercase tracking-wide truncate px-1">
                {p.category}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-50 flex items-center justify-center py-8">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Sin imágenes disponibles</p>
        </div>
      )}

      {/* MEDIO: Título + info button */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Look 0{index + 1}</p>
          <h3 className="font-serif text-zinc-900 text-lg leading-tight">{outfit.titulo}</h3>
        </div>
        <button
          onClick={() => setShowDesc((v) => !v)}
          className="shrink-0 mt-1 w-6 h-6 border border-zinc-300 flex items-center justify-center text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
          title="Ver justificación">
          <span className="text-[10px] font-medium">?</span>
        </button>
      </div>

      {/* Descripción expandible */}
      <AnimatePresence>
        {showDesc && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden">
            <p className="px-4 pb-3 text-xs text-zinc-500 leading-relaxed border-t border-zinc-100 pt-3">
              {outfit.descripcion}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ABAJO: CTA */}
      <div className="px-4 pb-4">
        {isElegido ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="w-full py-2.5 border border-zinc-200 text-zinc-400 text-xs text-center tracking-widest uppercase">
            Outfit registrado
          </motion.div>
        ) : (
          <motion.button whileTap={{ scale: 0.98 }} onClick={onElegir}
            disabled={isEligiendo || isGuest}
            className="w-full py-2.5 border border-zinc-900 text-zinc-900 text-xs font-medium tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-40">
            {isEligiendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {isEligiendo ? "Registrando..." : "Elegir este outfit"}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

// ─── RENTA HELPERS ────────────────────────────────────────────────────────────
const CATEGORIAS_RENTA_PERMITIDAS = ["vestido", "accesorio", "accesorios", "bolsa", "joyería", "lentes"]
function categoriaPermiteRenta(category: string) {
  return CATEGORIAS_RENTA_PERMITIDAS.some((c) => category.toLowerCase().includes(c))
}
const STATIC_RENTA: Prenda[] = [
  { id: "r1", user_id: "market", name: "Vestido de Noche Satinado", category: "Vestido", image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", talla: "S", estado_uso: "Como nuevo", precio_renta: 350, en_renta: true, created_at: "" },
  { id: "r2", user_id: "market", name: "Bolso Clutch Dorado", category: "Accesorio", image_url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80", talla: "Única", estado_uso: "Como nuevo", precio_renta: 150, en_renta: true, created_at: "" },
  { id: "r3", user_id: "market", name: "Vestido Midi Floral", category: "Vestido", image_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80", talla: "M", estado_uso: "Poco uso", precio_renta: 280, en_renta: true, created_at: "" },
]

// ─── VIEW: MARKETPLACE ────────────────────────────────────────────────────────
const filterChips = ["Todos", "Ropa", "Accesorios", "Zapatos"]

function MarketplaceView({ userId, isGuest, userPrendas, onApartar }: { userId: string; isGuest: boolean; userPrendas: Prenda[]; onApartar: () => void }) {
  const [marketTab, setMarketTab] = useState<"comprar" | "rentar">("comprar")
  const [activeFilter, setActiveFilter] = useState("Todos")
  const [items, setItems] = useState<Prenda[]>([])
  const [rentaItems, setRentaItems] = useState<Prenda[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<Prenda | null>(null)
  const [aparting, setAparting] = useState(false)
  const [apartSuccess, setApartSuccess] = useState(false)
  const [showSellForm, setShowSellForm] = useState(false)
  const [sellMode, setSellMode] = useState<"venta" | "renta">("venta")
  const [sellStep, setSellStep] = useState<"select" | "details">("select")
  const [sellPrenda, setSellPrenda] = useState<Prenda | null>(null)
  const [sellForm, setSellForm] = useState({ precio: "", talla: "", estado_uso: "" })
  const [selling, setSelling] = useState(false)
  const [rentaError, setRentaError] = useState<string | null>(null)
  const [showFechaRenta, setShowFechaRenta] = useState(false)
  const [fechaRenta, setFechaRenta] = useState("")

  function handleSelectSellPrenda(p: Prenda) {
    setSellPrenda(p)
    setSellForm({ precio: "", talla: p.talla ?? "", estado_uso: p.estado_uso ?? "" })
    setRentaError(null)
    setSellStep("details")
  }

  useEffect(() => {
    if (isGuest) { setItems(STATIC_MARKET); setRentaItems(STATIC_RENTA); setLoading(false); return }
    Promise.all([
      supabase.from("prendas").select("*").eq("en_venta", true).order("created_at", { ascending: false }),
      supabase.from("prendas").select("*").eq("en_renta", true).order("created_at", { ascending: false }),
    ]).then(([{ data: venta }, { data: renta }]) => {
      setItems(venta?.length ? venta : STATIC_MARKET)
      setRentaItems(renta?.length ? renta : STATIC_RENTA)
      setLoading(false)
    })
  }, [isGuest])

  const currentItems = marketTab === "comprar" ? items : rentaItems
  const filtered = activeFilter === "Todos" ? currentItems : currentItems.filter((i) => i.category === activeFilter)

  async function handleApartar() {
    if (!selectedItem || isGuest) return
    setAparting(true)
    try {
      if (marketTab === "rentar") {
        if (!fechaRenta) { setShowFechaRenta(true); setAparting(false); return }
        // 1. Add to buyer's wardrobe with fecha_renta
        const { error: insertError } = await supabase.from("prendas").insert({
          user_id: userId, name: selectedItem.name, category: selectedItem.category,
          image_url: selectedItem.image_url, talla: selectedItem.talla,
          estado_uso: selectedItem.estado_uso, precio_renta: selectedItem.precio_renta,
          metadata: selectedItem.metadata, en_renta: true, fecha_renta: fechaRenta,
        })
        if (insertError) throw insertError
        // 2. Mark original as no longer available for rent
        await supabase.from("prendas").update({ en_renta: false }).eq("id", selectedItem.id)
        setRentaItems((prev) => prev.filter((p) => p.id !== selectedItem.id))
        onApartar()
        setApartSuccess(true)
        setShowFechaRenta(false)
        setFechaRenta("")
        setTimeout(() => { setApartSuccess(false); setSelectedItem(null) }, 2000)
        return
      }
      // Comprar flow
      const { error: insertError } = await supabase.from("prendas").insert({
        user_id: userId, name: selectedItem.name, category: selectedItem.category,
        image_url: selectedItem.image_url, talla: selectedItem.talla,
        estado_uso: selectedItem.estado_uso, precio: selectedItem.precio,
        metadata: selectedItem.metadata, en_venta: false,
      })
      if (insertError) throw insertError
      await supabase.from("prendas").update({ en_venta: false }).eq("id", selectedItem.id)
      setApartSuccess(true)
      onApartar()
      setItems((prev) => prev.filter((p) => p.id !== selectedItem.id))
      setTimeout(() => { setApartSuccess(false); setSelectedItem(null) }, 2000)
    } catch (err) { console.error("Error apartando:", err) }
    finally { setAparting(false) }
  }

  async function handleSell() {
    if (!sellPrenda || !sellForm.precio) return
    setSelling(true); setRentaError(null)
    try {
      if (sellMode === "renta") {
        if (!categoriaPermiteRenta(sellPrenda.category)) {
          setRentaError("Solo vestidos y accesorios aplican para renta"); return
        }
        const res = await fetch("/api/renta", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prenda_id: sellPrenda.id, precio_renta: sellForm.precio, user_id: userId }),
        })
        const data = await res.json()
        if (!res.ok) { setRentaError(data.error); return }
        const { data: updated } = await supabase.from("prendas").select("*").eq("en_renta", true).order("created_at", { ascending: false })
        setRentaItems(updated?.length ? updated : STATIC_RENTA)
      } else {
        await supabase.from("prendas").update({
          en_venta: true, precio: parseFloat(sellForm.precio),
          talla: sellForm.talla || null, estado_uso: sellForm.estado_uso || null,
        }).eq("id", sellPrenda.id)
        const { data } = await supabase.from("prendas").select("*").eq("en_venta", true).order("created_at", { ascending: false })
        setItems(data?.length ? data : STATIC_MARKET)
      }
      setShowSellForm(false); setSellStep("select"); setSellPrenda(null); setSellForm({ precio: "", talla: "", estado_uso: "" })
    } catch (err) { console.error("Error publicando:", err) }
    finally { setSelling(false) }
  }

  const myPrendasAvailable = userPrendas.filter((p) => !p.en_venta && !p.en_renta)

  return (
    <motion.div {...pageProps} className="flex flex-col gap-6 pb-32 pt-8">
      <div className="px-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Descubre</p>
          <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">Marketplace</h1>
        </div>
        {!isGuest && (
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setShowSellForm(true); setSellStep("select"); setSellMode("venta") }}
            className="border border-zinc-900 text-zinc-900 text-xs px-3 py-1.5 flex items-center gap-1 tracking-wide">
            <Tag className="w-3 h-3" /> Publicar
          </motion.button>
        )}
      </div>

      <div className="px-4 flex border-b border-zinc-200">
        {(["comprar", "rentar"] as const).map((tab) => (
          <button key={tab} onClick={() => { setMarketTab(tab); setActiveFilter("Todos") }}
            className={cn("flex-1 py-2.5 text-xs font-medium tracking-widest uppercase transition-colors border-b-2 -mb-px",
              marketTab === tab ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400")}>
            {tab === "comprar" ? "Comprar" : "Rentar"}
          </button>
        ))}
      </div>

      <div className="px-4 relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input placeholder="Buscar prendas..." className="pl-10 rounded-none border-zinc-200 focus-visible:ring-0 focus-visible:border-zinc-900 text-zinc-700 placeholder:text-zinc-400" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 px-4">
        {filterChips.map((f) => (
          <motion.button key={f} whileTap={{ scale: 0.96 }} onClick={() => setActiveFilter(f)}
            className={cn("shrink-0 px-4 py-1.5 text-xs tracking-wide border transition-colors",
              activeFilter === f ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600")}>
            {f}
          </motion.button>
        ))}
      </div>

      {loading ? <PrendaSkeleton /> : filtered.length === 0 ? (
        <div className="mx-4 flex flex-col items-center justify-center py-12 gap-2 border border-zinc-100">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Sin prendas disponibles</p>
        </div>
      ) : (
        <div className="columns-2 gap-3 px-4 space-y-3">
          {filtered.map((item, i) => (
            <motion.div key={item.id} whileTap={{ scale: 0.98 }} onClick={() => setSelectedItem(item)}
              className="break-inside-avoid overflow-hidden bg-zinc-50 mb-3 cursor-pointer">
              <img src={item.image_url || fashionImages[i % fashionImages.length]} alt={item.name}
                className="w-full object-cover" style={{ height: i % 2 === 0 ? "180px" : "140px" }} />
              <div className="p-2.5">
                <p className="text-xs font-medium text-zinc-900 truncate">{item.name}</p>
                <p className="text-[10px] text-zinc-400">{item.estado_uso ?? item.category}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs font-semibold text-zinc-900">
                    ${marketTab === "rentar" ? (item.precio_renta ?? "—") : (item.precio ?? "—")}
                    {marketTab === "rentar" && <span className="text-[9px] text-zinc-400 font-normal ml-0.5">/día</span>}
                  </p>
                  {marketTab === "rentar" && (
                    <span className="text-[9px] border border-zinc-300 text-zinc-500 px-1.5 py-0.5 uppercase tracking-wide">Renta</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <CenteredModal open={!!selectedItem} onClose={() => { setSelectedItem(null); setApartSuccess(false); setShowFechaRenta(false); setFechaRenta("") }}>
        {selectedItem && (
          <div className="flex flex-col">
            <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-64 object-cover" />
            <div className="p-6 flex flex-col gap-4">
              <div>
                <h2 className="font-serif text-xl text-zinc-900">{selectedItem.name}</h2>
                <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">{selectedItem.category}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                    {marketTab === "rentar" ? "Precio / día" : "Precio"}
                  </p>
                  <p className="font-serif text-2xl text-zinc-900">
                    ${marketTab === "rentar" ? (selectedItem.precio_renta ?? "—") : (selectedItem.precio ?? "—")}
                  </p>
                </div>
                {selectedItem.talla && (
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Talla</p>
                    <p className="text-sm font-medium text-zinc-900">{selectedItem.talla}</p>
                  </div>
                )}
                {selectedItem.estado_uso && (
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Estado</p>
                    <p className="text-sm font-medium text-zinc-900">{selectedItem.estado_uso}</p>
                  </div>
                )}
              </div>
              {apartSuccess ? (
                <div className="w-full py-3 border border-zinc-200 text-zinc-600 text-sm text-center tracking-wide">
                  {marketTab === "rentar" ? "Solicitud enviada" : "Apartado correctamente"}
                </div>
              ) : marketTab === "rentar" && showFechaRenta ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">
                      Fecha de renta
                    </label>
                    <Input type="date" value={fechaRenta}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setFechaRenta(e.target.value)}
                      className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <motion.button whileTap={{ scale: 0.98 }}
                      onClick={() => { setShowFechaRenta(false); setFechaRenta("") }}
                      className="flex-1 py-2.5 border border-zinc-200 text-zinc-500 text-xs tracking-wide">
                      Cancelar
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.98 }} onClick={handleApartar}
                      disabled={!fechaRenta || aparting}
                      className="flex-1 py-2.5 bg-zinc-900 text-white text-xs font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-40">
                      {aparting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Confirmar Renta
                    </motion.button>
                  </div>
                </div>
              ) : (
                <motion.button whileTap={{ scale: 0.98 }} onClick={handleApartar} disabled={aparting || isGuest}
                  className={cn("w-full py-3 text-sm font-medium tracking-wide flex items-center justify-center gap-2",
                    isGuest ? "bg-zinc-100 text-zinc-400 cursor-default" : "bg-zinc-900 text-white disabled:opacity-50")}>
                  {aparting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isGuest ? "Solo lectura" : aparting ? "Procesando..." : marketTab === "rentar" ? "Solicitar Renta" : "Apartar"}
                </motion.button>
              )}
            </div>
          </div>
        )}
      </CenteredModal>

      <CenteredModal open={showSellForm} onClose={() => { setShowSellForm(false); setSellStep("select"); setSellPrenda(null); setRentaError(null) }}>
        <div className="p-6 flex flex-col gap-4">
          {sellStep === "select" ? (
            <>
              <div className="flex border border-zinc-200 pr-8">
                {(["venta", "renta"] as const).map((m) => (
                  <button key={m} onClick={() => { setSellMode(m); setRentaError(null) }}
                    className={cn("flex-1 py-2 text-xs font-medium tracking-widest uppercase transition-colors",
                      sellMode === m ? "bg-zinc-900 text-white" : "text-zinc-500")}>
                    {m === "venta" ? "Vender" : "Rentar"}
                  </button>
                ))}
              </div>
              {sellMode === "renta" && (
                <p className="text-[10px] text-zinc-400 border border-zinc-100 px-3 py-2">
                  Solo vestidos y accesorios aplican para renta
                </p>
              )}
              <p className="font-serif text-zinc-900 text-lg">¿Qué prenda?</p>
              {myPrendasAvailable.length === 0 ? (
                <p className="text-xs text-zinc-400 border border-zinc-100 p-4 text-center">No tienes prendas disponibles.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {myPrendasAvailable.map((p) => {
                    const bloqueada = sellMode === "renta" && !categoriaPermiteRenta(p.category)
                    return (
                      <button key={p.id} onClick={() => !bloqueada && handleSelectSellPrenda(p)}
                        disabled={bloqueada} title={bloqueada ? "Solo vestidos y accesorios aplican para renta" : undefined}
                        className={cn("relative overflow-hidden border-2 transition-all",
                          bloqueada ? "opacity-30 cursor-not-allowed border-transparent" :
                          sellPrenda?.id === p.id ? "border-zinc-900" : "border-transparent")}>
                        <img src={p.image_url} alt={p.name} className="w-full h-20 object-cover" />
                        <p className="text-[10px] text-zinc-600 truncate px-1 py-1 bg-white">{p.name}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 pr-8">
                <button onClick={() => setSellStep("select")} className="text-xs text-zinc-400 underline">← Volver</button>
                <p className="font-serif text-zinc-900 text-lg">{sellPrenda?.name}</p>
              </div>
              {sellPrenda && <img src={sellPrenda.image_url} alt={sellPrenda.name} className="w-full h-40 object-cover" />}
              <div className="flex gap-4">
                {sellForm.talla && (
                  <div className="flex-1">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Talla</p>
                    <p className="text-sm text-zinc-700 border border-zinc-100 px-3 py-2 bg-zinc-50">{sellForm.talla}</p>
                  </div>
                )}
                {sellForm.estado_uso && (
                  <div className="flex-1">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Estado</p>
                    <p className="text-sm text-zinc-700 border border-zinc-100 px-3 py-2 bg-zinc-50">{sellForm.estado_uso}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">
                  {sellMode === "renta" ? "Precio por día (MXN) *" : "Precio (MXN) *"}
                </label>
                <Input value={sellForm.precio} onChange={(e) => setSellForm(f => ({ ...f, precio: e.target.value }))}
                  placeholder="Ej. 350" type="number"
                  className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900" />
              </div>
              {rentaError && <p className="text-xs text-zinc-500 border border-zinc-200 px-3 py-2">{rentaError}</p>}
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleSell} disabled={selling || !sellForm.precio}
                className="w-full py-3 bg-zinc-900 text-white text-sm font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
                {selling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {selling ? "Publicando..." : sellMode === "renta" ? "Publicar para Renta" : "Publicar en Marketplace"}
              </motion.button>
            </>
          )}
        </div>
      </CenteredModal>
    </motion.div>
  )
}

// ─── ANIMATED NUMBER ──────────────────────────────────────────────────────────
function AnimatedNumber({ target }: { target: number }) {
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 })
  const [display, setDisplay] = useState(0)
  useEffect(() => { motionVal.set(target) }, [target, motionVal])
  useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring])
  return <>{display}</>
}

// ─── VIEW: ESTADÍSTICAS ───────────────────────────────────────────────────────
function EstadisticasView({ userId, userName, isGuest, onSellPrenda }: {
  userId: string      // UUID — used for prendas queries (RLS)
  userName: string    // email prefix — used for usuarios_permitidos lookup
  isGuest: boolean
  onSellPrenda: (p: Prenda) => void
}) {
  const [stats, setStats] = useState({ total: 0, usos: 0, outfits: 0, sinUsar: 0 })
  const [topPrendas, setTopPrendas] = useState<Prenda[]>([])
  const [olvidadas, setOlvidadas] = useState<Prenda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isGuest) { setLoading(false); return }
    async function load() {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const [{ data: prendas }, { data: userData }] = await Promise.all([
        supabase.from("prendas").select("*").eq("user_id", userId),          // UUID → RLS passes
        supabase.from("usuarios_permitidos").select("outfits_creados").eq("username", userName).single(), // email prefix
      ])
      const all = (prendas ?? []) as (Prenda & { usos?: number; ultimo_uso?: string })[]
      const total = all.length
      const usos = all.reduce((sum, p) => sum + (p.usos ?? 0), 0)
      const outfits = (userData as { outfits_creados?: number } | null)?.outfits_creados ?? 0
      const sinUsar = all.filter((p) =>
        (p.usos ?? 0) === 0 || (p.ultimo_uso && new Date(p.ultimo_uso) < sixMonthsAgo)
      ).length
      setStats({ total, usos, outfits, sinUsar })
      setTopPrendas([...all].sort((a, b) => (b.usos ?? 0) - (a.usos ?? 0)).slice(0, 3))
      setOlvidadas(
        [...all]
          .filter((p) => (p.usos ?? 0) === 0 || (p.ultimo_uso && new Date(p.ultimo_uso) < sixMonthsAgo))
          .sort((a, b) => (a.ultimo_uso ? new Date(a.ultimo_uso).getTime() : 0) - (b.ultimo_uso ? new Date(b.ultimo_uso).getTime() : 0))
          .slice(0, 3)
      )
      setLoading(false)
    }
    load().catch(console.error)
  }, [userId, isGuest])

  function fmt(iso?: string | null) {
    if (!iso) return "Nunca usado"
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    if (d === 0) return "Hoy"
    if (d === 1) return "Ayer"
    if (d < 30) return `hace ${d} días`
    if (d < 365) return `hace ${Math.floor(d / 30)} meses`
    return `hace ${Math.floor(d / 365)} años`
  }

  const kpis = isGuest
    ? [{ value: 6, label: "Total Prendas" }, { value: 14, label: "Usos este mes" }, { value: 3, label: "Outfits creados" }, { value: 1, label: "Sin usar (6m)" }]
    : [{ value: stats.total, label: "Total Prendas" }, { value: stats.usos, label: "Usos este mes" }, { value: stats.outfits, label: "Outfits creados" }, { value: stats.sinUsar, label: "Sin usar (6m)" }]

  type PrendaExt = Prenda & { usos?: number; ultimo_uso?: string }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-32 pt-8">
      <div className="px-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest">Insights</p>
        <h1 className="font-serif text-2xl text-zinc-900 mt-0.5">Estadísticas</h1>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-zinc-400 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 px-4">
            {kpis.map((stat) => (
              <div key={stat.label} className="border border-zinc-100 p-5">
                <p className="font-serif text-3xl text-zinc-900"><AnimatedNumber target={stat.value} /></p>
                <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
          <section className="px-4">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Más Usadas</p>
            <div className="flex flex-col gap-2">
              {(isGuest ? GUEST_PRENDAS.slice(0, 3) as PrendaExt[] : topPrendas as PrendaExt[]).map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 border border-zinc-100 p-4">
                  <span className="font-mono text-xs text-zinc-400 w-5 shrink-0">{index + 1}</span>
                  {item.image_url && <img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-zinc-400">{isGuest ? "—" : fmt(item.ultimo_uso)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif text-lg text-zinc-900"><AnimatedNumber target={item.usos ?? 0} /></p>
                    <p className="text-[10px] text-zinc-400">usos</p>
                  </div>
                </div>
              ))}
              {!isGuest && topPrendas.length === 0 && <p className="text-xs text-zinc-400 text-center py-4">Sin datos de uso aún</p>}
            </div>
          </section>
          <section className="px-4">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Prendas Olvidadas</p>
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {(isGuest ? [] : olvidadas as PrendaExt[]).map((item) => (
                  <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }}
                    className="flex items-center gap-3 border border-zinc-100 p-4">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-zinc-400">{fmt(item.ultimo_uso)}</p>
                    </div>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => onSellPrenda(item)}
                      className="shrink-0 text-xs border border-zinc-900 text-zinc-900 px-3 py-1.5 tracking-wide">
                      Vender
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!isGuest && olvidadas.length === 0 && <p className="text-xs text-zinc-400 text-center py-4">Sin prendas olvidadas</p>}
              {isGuest && <p className="text-xs text-zinc-400 text-center py-4">Inicia sesión para ver tus estadísticas</p>}
            </div>
          </section>
        </>
      )}
    </motion.div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export function ClossappDashboard() {
  const [userMode, setUserMode] = useState<UserMode | null>(null)
  const [userName, setUserName] = useState("Invitada")   // display only — shown in greeting
  const [userId, setUserId] = useState("guest")           // UUID from Supabase Auth — used for all DB queries
  const [activeView, setActiveView] = useState<View>("inicio")
  const [prendas, setPrendas] = useState<Prenda[]>([])
  const [marketFlash, setMarketFlash] = useState(false)
  const keyboardOpen = useKeyboardOpen()

  const isGuest = userMode === "GUEST"

  function handleLogin(mode: UserMode, uuid: string, displayName: string) {
    setUserMode(mode)
    setUserId(uuid)           // UUID → used for .eq("user_id", userId) in every query
    setUserName(displayName)  // email prefix → shown in "Hola, {userName}"
  }

  // Keep prendas in sync for simulador and marketplace
  useEffect(() => {
    if (activeView === "simulador" || activeView === "marketplace") {
      if (isGuest) { setPrendas(GUEST_PRENDAS); return }
      fetchPrendas(userId).then(setPrendas).catch(console.error)
    }
  }, [activeView, userId, isGuest])

  function handleSellItem() {
    setMarketFlash(true)
    setTimeout(() => { setActiveView("marketplace"); setMarketFlash(false) }, 600)
  }

  const renderView = () => {
    switch (activeView) {
      case "inicio": return <InicioView userName={userName} isGuest={isGuest} />
      case "armario": return <ArmarioView userId={userId} isGuest={isGuest} />
      case "simulador": return <SimuladorView prendas={prendas} isGuest={isGuest} onElegir={() => setActiveView("armario")} userId={userId} userName={userName} />
      case "marketplace": return <MarketplaceView userId={userId} isGuest={isGuest} userPrendas={prendas} onApartar={() => fetchPrendas(userId).then(setPrendas).catch(console.error)} />
      case "estadisticas": return <EstadisticasView userId={userId} userName={userName} isGuest={isGuest} onSellPrenda={(p) => setActiveView("marketplace")} />
      default: return <InicioView userName={userName} isGuest={isGuest} />
    }
  }

  return (
    <div className="flex items-start justify-center min-h-screen bg-white">
      <div className="w-full max-w-2xl mx-auto min-h-screen bg-white relative">
        <AnimatePresence mode="wait">
          {!userMode ? (
            <LoginView key="login" onLogin={handleLogin} />
          ) : (
            <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
              className="relative min-h-screen">
              <div className="overflow-y-auto h-screen pb-36">
                <AnimatePresence mode="wait">
                  <div key={activeView}>{renderView()}</div>
                </AnimatePresence>
              </div>

              {/* Bottom Nav */}
              <AnimatePresence>
                {!keyboardOpen && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe pb-6 pointer-events-none">
                    <nav className="w-[92%] max-w-2xl bg-white/80 backdrop-blur-xl border border-zinc-200 px-6 py-3 flex justify-between items-center shadow-lg pointer-events-auto">
                      {navItems.map((item) => {
                        const isActive = activeView === item.id
                        const isFlashing = marketFlash && item.id === "marketplace"
                        return (
                          <motion.button key={item.id} whileTap={{ scale: 0.82 }} onClick={() => setActiveView(item.id)}
                            className="flex flex-col items-center gap-0.5 relative">
                            {isFlashing && (
                              <motion.span initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 2.5, opacity: 0 }}
                                transition={{ duration: 0.6 }} className="absolute inset-0 rounded-full bg-zinc-300" />
                            )}
                            <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-zinc-900" : "text-zinc-400")} />
                            <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-zinc-900" : "text-zinc-400")}>
                              {item.label}
                            </span>
                          </motion.button>
                        )
                      })}
                    </nav>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
