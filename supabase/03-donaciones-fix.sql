-- =======================================================
-- MIGRACIÓN SUPABASE 03: FIX NOMBRE DE DONANTE Y PRENDAS
-- =======================================================

-- 1. Agregar campos donor_name y donor_email a donacion_tickets si no existen
ALTER TABLE public.donacion_tickets 
  ADD COLUMN IF NOT EXISTS donor_name TEXT DEFAULT 'Donante ClossApp',
  ADD COLUMN IF NOT EXISTS donor_email TEXT;

-- 2. Función para validar ticket QR con parámetros completos y actualización atómica
CREATE OR REPLACE FUNCTION public.validar_donacion_qr(
  p_qr_token TEXT,
  p_centro_id TEXT,
  p_centro_nombre TEXT DEFAULT 'Centro de Acopio'
)
RETURNS JSONB AS $$
DECLARE
  v_ticket RECORD;
  v_puntos INT;
BEGIN
  -- Buscar ticket por token QR (tanto pendiente como completado)
  SELECT * INTO v_ticket FROM public.donacion_tickets 
  WHERE qr_token = p_qr_token OR id::text = p_qr_token;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket no encontrado en la base de datos.';
  END IF;

  -- Calcular puntos: 100 pts base por 3 prendas + 20 pts extra por prenda adicional
  IF v_ticket.cantidad_prendas >= 3 THEN
    v_puntos := 100 + ((v_ticket.cantidad_prendas - 3) * 20);
  ELSE
    v_puntos := 0;
  END IF;

  -- Marcar ticket como completado si estaba pendiente
  IF v_ticket.status = 'pendiente' THEN
    UPDATE public.donacion_tickets 
    SET status = 'completado',
        puntos_otorgados = v_puntos,
        validated_at = NOW(),
        validated_by = p_centro_id
    WHERE id = v_ticket.id;

    -- Registrar en historial de puntos si aplica
    IF v_ticket.user_id IS NOT NULL AND v_puntos > 0 THEN
      INSERT INTO public.puntos_historial (user_id, puntos, tipo, referencia_id, descripcion)
      VALUES (v_ticket.user_id, v_puntos, 'donacion', v_ticket.id, 'Donación de ' || v_ticket.cantidad_prendas || ' prendas verificada en ' || p_centro_nombre);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket.id,
    'donor_name', COALESCE(v_ticket.donor_name, 'Donante ClossApp'),
    'donor_email', v_ticket.donor_email,
    'cantidad_prendas', v_ticket.cantidad_prendas,
    'prendas_ids', v_ticket.prendas_ids,
    'puntos', v_puntos,
    'user_id', v_ticket.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
