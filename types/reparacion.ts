export type ReparacionDB = {
  id: string
  user_id: string
  prenda_id: string | null
  prenda: string
  tarea: string
  prioridad: "Baja" | "Media" | "Alta"
  completado: boolean
  created_at: string
}
