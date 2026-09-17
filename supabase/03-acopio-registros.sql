-- =======================================================
-- MIGRACIÓN SUPABASE: TABLA DE REGISTROS DE CENTRO DE ACOPIO
-- =======================================================

-- 1. Tabla de Puntos de Acopio Aliados
CREATE TABLE IF NOT EXISTS public.puntos_acopio (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  zona TEXT NOT NULL,
  horario TEXT NOT NULL,
  direccion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed de Puntos de Acopio por defecto
INSERT INTO public.puntos_acopio (id, nombre, zona, horario, direccion)
VALUES 
  ('centro', 'Punto de acopio Centro', 'Saltillo Centro', 'Lun a Vie · 9:00 a 18:00', 'Calle Hidalgo #123, Centro'),
  ('norte', 'Punto de acopio Norte', 'Zona Norte', 'Lun a Sáb · 10:00 a 17:00', 'Blvd. Venustiano Carranza #4500'),
  ('republica', 'Punto de acopio República', 'Fracc. República', 'Mar a Dom · 11:00 a 19:00', 'Av. Universidad #890')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  zona = EXCLUDED.zona,
  horario = EXCLUDED.horario;

-- 2. Tabla de Tickets de Donación
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

-- 3. Tabla de Registros del Centro de Acopio (Bitácora de escaneos y recepciones)
CREATE TABLE IF NOT EXISTS public.acopio_registros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.donacion_tickets(id) ON DELETE SET NULL,
  punto_acopio_id TEXT NOT NULL,
  punto_acopio_nombre TEXT NOT NULL,
  donor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name TEXT NOT NULL DEFAULT 'Donante ClossApp',
  donor_email TEXT,
  cantidad_prendas INT NOT NULL CHECK (cantidad_prendas >= 1),
  puntos_otorgados INT NOT NULL DEFAULT 0,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  observaciones TEXT DEFAULT 'Donación recibida y verificada correctamente'
);

-- 4. Tabla Historial de Puntos
CREATE TABLE IF NOT EXISTS public.puntos_historial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  puntos INT NOT NULL,
  tipo TEXT CHECK (tipo IN ('donacion', 'canje_suscripcion', 'bono')) NOT NULL,
  referencia_id UUID,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE public.puntos_acopio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donacion_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acopio_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puntos_historial ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para lectura y modificación en demo/autenticado
CREATE POLICY "Lectura publica de puntos de acopio" ON public.puntos_acopio FOR SELECT USING (true);

CREATE POLICY "Los usuarios ven tickets de donacion" ON public.donacion_tickets FOR SELECT USING (true);
CREATE POLICY "Los usuarios crean tickets de donacion" ON public.donacion_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Los usuarios actualizan tickets de donacion" ON public.donacion_tickets FOR UPDATE USING (true);

CREATE POLICY "Lectura de registros de acopio" ON public.acopio_registros FOR SELECT USING (true);
CREATE POLICY "Creacion de registros de acopio" ON public.acopio_registros FOR INSERT WITH CHECK (true);

CREATE POLICY "Lectura de historial de puntos" ON public.puntos_historial FOR SELECT USING (true);
CREATE POLICY "Insercion de historial de puntos" ON public.puntos_historial FOR INSERT WITH CHECK (true);

-- 6. RPC: Validación del QR y registro completo en bitácora de acopio
CREATE OR REPLACE FUNCTION public.validar_donacion_qr(
  p_qr_token TEXT,
  p_centro_id TEXT,
  p_centro_nombre TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_ticket RECORD;
  v_puntos INT;
  v_centro_nombre TEXT;
  v_registro_id UUID;
BEGIN
  -- Buscar ticket pendiente por token QR
  SELECT * INTO v_ticket FROM public.donacion_tickets 
  WHERE qr_token = p_qr_token AND status = 'pendiente';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket no encontrado, expirado o ya verificado.';
  END IF;

  v_centro_nombre := COALESCE(p_centro_nombre, v_ticket.punto_acopio_nombre);

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

  -- 2. Registrar en la tabla de bitácora acopio_registros
  INSERT INTO public.acopio_registros (
    ticket_id,
    punto_acopio_id,
    punto_acopio_nombre,
    donor_user_id,
    donor_name,
    donor_email,
    cantidad_prendas,
    puntos_otorgados,
    fecha_registro,
    observaciones
  ) VALUES (
    v_ticket.id,
    p_centro_id,
    v_centro_nombre,
    v_ticket.user_id,
    'Donante ClossApp',
    NULL,
    v_ticket.cantidad_prendas,
    v_puntos,
    NOW(),
    'Recepción y escaneo verificado en Centro de Acopio'
  ) RETURNING id INTO v_registro_id;

  -- 3. Registrar movimiento en historial de puntos si aplica
  IF v_puntos > 0 AND v_ticket.user_id IS NOT NULL THEN
    INSERT INTO public.puntos_historial (user_id, puntos, tipo, referencia_id, descripcion)
    VALUES (v_ticket.user_id, v_puntos, 'donacion', v_ticket.id, 'Donación verificada en ' || v_centro_nombre);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket.id,
    'registro_id', v_registro_id,
    'puntos', v_puntos,
    'user_id', v_ticket.user_id,
    'cantidad_prendas', v_ticket.cantidad_prendas,
    'centro_nombre', v_centro_nombre
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
