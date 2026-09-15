-- =======================================================
-- MIGRACIÓN SUPABASE: SISTEMA DE DONACIONES Y PUNTOS QR
-- =======================================================

-- 1. Tabla de Tickets de Donación con QR
CREATE TABLE IF NOT EXISTS public.donacion_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  punto_acopio_id TEXT NOT NULL,
  punto_acopio_nombre TEXT NOT NULL,
  status TEXT CHECK (status IN ('pendiente', 'completado', 'expirado')) DEFAULT 'pendiente',
  cantidad_prendas INT NOT NULL CHECK (cantidad_prendas >= 1),
  prendas_ids JSONB NOT NULL,
  puntos_otorgados INT DEFAULT 0,
  qr_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  validated_by TEXT
);

-- 2. Tabla de Historial de Puntos de Usuario
CREATE TABLE IF NOT EXISTS public.puntos_historial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  puntos INT NOT NULL,
  tipo TEXT CHECK (tipo IN ('donacion', 'canje_suscripcion', 'bono')) NOT NULL,
  referencia_id UUID,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.donacion_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puntos_historial ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura para usuarios autenticados
CREATE POLICY "Los usuarios ven sus propios tickets"
  ON public.donacion_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus tickets"
  ON public.donacion_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios ver sus puntos"
  ON public.puntos_historial FOR SELECT
  USING (auth.uid() = user_id);

-- 4. RPC: Validación del QR por el Centro de Acopio y Acreditación Atómica de Puntos
CREATE OR REPLACE FUNCTION public.validar_donacion_qr(
  p_qr_token TEXT,
  p_centro_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_ticket RECORD;
  v_puntos INT;
BEGIN
  -- Buscar ticket pendiente por token QR
  SELECT * INTO v_ticket FROM public.donacion_tickets 
  WHERE qr_token = p_qr_token AND status = 'pendiente';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket no encontrado, expirado o ya verificado.';
  END IF;

  -- Calcular puntos: 100 pts base por 3 prendas + 20 pts extra por prenda adicional
  IF v_ticket.cantidad_prendas >= 3 THEN
    v_puntos := 100 + ((v_ticket.cantidad_prendas - 3) * 20);
  ELSE
    v_puntos := 0;
  END IF;

  -- 1. Marcar ticket como completado
  UPDATE public.donacion_tickets 
  SET status = 'completado',
      puntos_otorgados = v_puntos,
      validated_at = NOW(),
      validated_by = p_centro_id
  WHERE id = v_ticket.id;

  -- 2. Registrar movimiento en historial de puntos
  IF v_puntos > 0 THEN
    INSERT INTO public.puntos_historial (user_id, puntos, tipo, referencia_id, descripcion)
    VALUES (v_ticket.user_id, v_puntos, 'donacion', v_ticket.id, 'Donación verificada en centro de acopio');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket.id,
    'puntos', v_puntos,
    'user_id', v_ticket.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
