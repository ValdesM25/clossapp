-- =======================================================
-- MIGRACIÓN SUPABASE 04: SISTEMA DE CUSTODIA (ESCROW) Y CARRITO
-- =======================================================

-- 1. Tabla de Órdenes de Custodia (Escrow Orders)
CREATE TABLE IF NOT EXISTS public.escrow_ordenes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_code TEXT UNIQUE NOT NULL,
  qr_token TEXT UNIQUE NOT NULL,
  buyer_user_id TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  garantia_escrow NUMERIC(10, 2) DEFAULT 0.00,
  total_pagado NUMERIC(10, 2) NOT NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'tarjeta',
  status TEXT CHECK (status IN ('pago_en_custodia', 'listo_en_punto', 'entregado_y_liberado', 'cancelado')) DEFAULT 'pago_en_custodia',
  punto_acopio_id TEXT DEFAULT 'norte',
  punto_acopio_nombre TEXT DEFAULT 'Centro de Acopio Norte',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  validated_by TEXT
);

-- 2. Habilitar RLS
ALTER TABLE public.escrow_ordenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica de ordenes escrow" ON public.escrow_ordenes FOR SELECT USING (true);
CREATE POLICY "Creacion publica de ordenes escrow" ON public.escrow_ordenes FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizacion publica de ordenes escrow" ON public.escrow_ordenes FOR UPDATE USING (true);
