-- ============================================================
-- SQL SCHEMA FOR CLOSSAPP DONATION & POINTS SYSTEM (SUPABASE)
-- Execute this script in your Supabase SQL Editor
-- ============================================================

-- 1. Tabla de Tickets de Donación (QR)
CREATE TABLE IF NOT EXISTS public.donacion_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    donor_name TEXT NOT NULL DEFAULT 'Donante ClossApp',
    donor_email TEXT,
    punto_acopio_id TEXT NOT NULL,
    punto_acopio_nombre TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente',
    cantidad_prendas INT NOT NULL DEFAULT 1,
    prendas_ids JSONB DEFAULT '[]'::jsonb,
    puntos_otorgados INT NOT NULL DEFAULT 0,
    qr_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    validated_by TEXT
);

-- 2. Tabla Bitácora / Registros de Centro de Acopio
CREATE TABLE IF NOT EXISTS public.acopio_registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.donacion_tickets(id) ON DELETE SET NULL,
    punto_acopio_id TEXT NOT NULL,
    punto_acopio_nombre TEXT NOT NULL,
    donor_user_id TEXT,
    donor_name TEXT NOT NULL DEFAULT 'Donante ClossApp',
    donor_email TEXT,
    cantidad_prendas INT NOT NULL DEFAULT 1,
    puntos_otorgados INT NOT NULL DEFAULT 0,
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    observaciones TEXT
);

-- 3. Tabla Historial de Puntos acumulados por usuario
CREATE TABLE IF NOT EXISTS public.puntos_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    puntos INT NOT NULL DEFAULT 0,
    tipo TEXT NOT NULL DEFAULT 'donacion',
    referencia_id TEXT,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Habilitar permisos de acceso público para lectura e inserción directa
ALTER TABLE public.donacion_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.acopio_registros DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.puntos_historial DISABLE ROW LEVEL SECURITY;
