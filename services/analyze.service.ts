import { resizeImage } from "./image.service"

export async function analyzePrenda(
  file: File,
  userId: string
): Promise<Record<string, string>> {
  const compressed = await resizeImage(file, 800, 0.7)
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(compressed)
  })

  const res = await fetch("/api/analyze-prenda", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mediaType: "image/jpeg", user_id: userId }),
  })
  if (!res.ok) throw new Error("Error al analizar")
  return res.json()
}
