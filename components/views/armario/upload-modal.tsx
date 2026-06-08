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

export function UploadModal({ preview, previewForm, analyzing, analyzeError, uploading, updateForm, onConfirm, onCancel }: UploadModalProps) {
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
