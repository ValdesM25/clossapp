"use client"

import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ImageUploadForm } from "@/hooks/use-image-upload"

interface UploadModalProps {
  preview: { url: string; file: File } | null
  previewForm: ImageUploadForm
  analyzing: boolean
  analyzeError: string | null
  uploading: boolean
  updateForm: (field: keyof ImageUploadForm, value: string) => void
  onConfirm: () => void
  onCancel: () => void
}

// Fecha local (no UTC) en formato YYYY-MM-DD para los límites del input de fecha.
function fechaLocal(diasAtras = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function UploadModal({ preview, previewForm, analyzing, analyzeError, uploading, updateForm, onConfirm, onCancel }: UploadModalProps) {
  const compraMarcada = previewForm.comprada_reciente === "si"
  const hoy = fechaLocal()
  const hace60 = fechaLocal(60)
  return (
    <div className="p-6 flex flex-col gap-4">
      <p className="font-serif text-zinc-900 text-lg pr-8">Nueva prenda</p>

      {preview && <img src={preview.url} alt="preview" className="w-full object-cover max-h-52" />}

      {analyzing && (
        <div className="flex items-center gap-3 border border-zinc-100 px-4 py-3">
          <Loader2 className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />
          <p className="text-xs text-zinc-500 tracking-wide">Analizando prenda...</p>
        </div>
      )}

      {analyzeError && (
        <p className="text-xs text-zinc-400 border border-zinc-100 px-4 py-3">{analyzeError}</p>
      )}

      {!analyzing && (
        <>
          <div>
            <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Nombre</label>
            <Input value={previewForm.nombre}
              onChange={(e) => updateForm("nombre", e.target.value)}
              placeholder="Ej. Blazer de Lino Negro"
              className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Categoría</label>
              <Input value={previewForm.categoria}
                onChange={(e) => updateForm("categoria", e.target.value)}
                placeholder="Top, Bottom..."
                className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Color</label>
              <Input value={previewForm.color_principal}
                onChange={(e) => updateForm("color_principal", e.target.value)}
                placeholder="Negro, Beige..."
                className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Estilo</label>
            <Input value={previewForm.estilo}
              onChange={(e) => updateForm("estilo", e.target.value)}
              placeholder="Minimalista, Casual..."
              className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-100">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Talla</label>
              <Input value={previewForm.talla}
                onChange={(e) => updateForm("talla", e.target.value)}
                placeholder="XS, S, M, 38..."
                className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Estado</label>
              <Select value={previewForm.estado_uso} onValueChange={(v) => updateForm("estado_uso", v)}>
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

          <div className="border-t border-zinc-100 pt-3 flex flex-col gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
              <input type="checkbox" checked={compraMarcada} className="w-4 h-4 accent-zinc-900"
                onChange={(e) => {
                  updateForm("comprada_reciente", e.target.checked ? "si" : "")
                  if (e.target.checked && !previewForm.compra_fecha) updateForm("compra_fecha", hoy)
                }} />
              La compré recientemente <span className="text-zinc-400">(+10 puntos al usarla)</span>
            </label>

            {compraMarcada && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Dónde</label>
                    <Select value={previewForm.compra_lugar} onValueChange={(v) => updateForm("compra_lugar", v)}>
                      <SelectTrigger className="rounded-none border-zinc-300 focus:ring-0 text-sm h-10"><SelectValue placeholder="Elige" /></SelectTrigger>
                      <SelectContent className="z-[110]">
                        <SelectItem value="tienda">Tienda física</SelectItem>
                        <SelectItem value="online">En línea</SelectItem>
                        <SelectItem value="segunda_mano">Segunda mano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Tienda (opcional)</label>
                    <Input value={previewForm.compra_tienda} maxLength={80}
                      onChange={(e) => updateForm("compra_tienda", e.target.value)}
                      placeholder="Ej. Zara"
                      className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Precio (MXN)</label>
                    <Input value={previewForm.compra_precio} type="number" inputMode="decimal" min={0}
                      onChange={(e) => updateForm("compra_precio", e.target.value)}
                      placeholder="Ej. 799"
                      className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 block">Fecha</label>
                    <Input value={previewForm.compra_fecha} type="date" max={hoy} min={hace60}
                      onChange={(e) => updateForm("compra_fecha", e.target.value)}
                      className="rounded-none border-zinc-300 focus-visible:ring-0 focus-visible:border-zinc-900 text-sm" />
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <button onClick={onConfirm} disabled={uploading || analyzing}
        className="w-full py-3 bg-zinc-900 text-white text-sm font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {uploading ? "Guardando..." : "Confirmar y Guardar"}
      </button>
    </div>
  )
}
