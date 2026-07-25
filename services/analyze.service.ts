import { resizeImage } from "./image.service"
import type { PrendaVentaAnalysis } from "@/types/analisis"

async function aBase64(file: File): Promise<string> {
  const compressed = await resizeImage(file, 800, 0.7)
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(compressed)
  })
}

export async function analyzePrenda(
  file: File,
  userId: string
): Promise<Record<string, string>> {
  const base64 = await aBase64(file)

  const res = await fetch("/api/analyze-prenda", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mediaType: "image/jpeg", user_id: userId }),
  })
  if (!res.ok) throw new Error("Error al analizar")
  return res.json()
}

/**
 * Tasación para publicar en el marketplace. Manda todas las fotos en una sola
 * petición: el precio, los defectos y la descripción de venta salen del mismo
 * análisis en vez de una llamada por dato.
 *
 * Corre sobre los archivos locales, así que no depende del bucket de Storage.
 */
export async function analyzePrendaVenta(
  files: File[],
  userId: string
): Promise<PrendaVentaAnalysis> {
  const imagesBase64 = await Promise.all(files.map(aBase64))

  const res = await fetch("/api/analyze-prenda", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imagesBase64,
      mediaType: "image/jpeg",
      user_id: userId,
      modo: "venta",
    }),
  })
  if (!res.ok) throw new Error("Error al tasar")
  return res.json()
}
