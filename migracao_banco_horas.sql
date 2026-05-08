-- =============================================
-- MIGRAÇÃO: BANCO DE HORAS
-- Executar no Supabase SQL Editor
-- =============================================

-- 1. Flag de liberação por usuário
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='usuarios' AND column_name='banco_horas_liberado'
    ) THEN
        ALTER TABLE public.usuarios
        ADD COLUMN banco_horas_liberado BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- 2. Tabela de Lançamentos (entradas tipo "13/04/26 - 02:15h" / "em haver: 10:30h")
CREATE TABLE IF NOT EXISTS public.banco_horas_lancamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
    data TEXT,             -- formato livre ex: "13/04/26"
    horas TEXT,            -- formato livre ex: "02:15h"
    em_haver TEXT,         -- formato livre ex: "10:30h"
    observacao TEXT,
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bh_lanc_usuario
    ON public.banco_horas_lancamentos(usuario_id, ordem);

-- 3. Tabela de Férias (períodos / saldos)
CREATE TABLE IF NOT EXISTS public.banco_horas_ferias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
    descricao TEXT,        -- ex: "10 dias - recesso de final do ano 2024"
    dias TEXT,             -- ex: "10 dias", "01 dia (tirado em período anterior)"
    periodo TEXT,          -- ex: "fev/2025", "maio", "julho"
    status TEXT,           -- ex: "ok", "pendente", "vencidas"
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bh_ferias_usuario
    ON public.banco_horas_ferias(usuario_id, ordem);

-- 4. RLS
ALTER TABLE public.banco_horas_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco_horas_ferias ENABLE ROW LEVEL SECURITY;

-- Drop policies antigas (idempotência)
DROP POLICY IF EXISTS "bh_lanc_select"  ON public.banco_horas_lancamentos;
DROP POLICY IF EXISTS "bh_lanc_insert"  ON public.banco_horas_lancamentos;
DROP POLICY IF EXISTS "bh_lanc_update"  ON public.banco_horas_lancamentos;
DROP POLICY IF EXISTS "bh_lanc_delete"  ON public.banco_horas_lancamentos;
DROP POLICY IF EXISTS "bh_fer_select"   ON public.banco_horas_ferias;
DROP POLICY IF EXISTS "bh_fer_insert"   ON public.banco_horas_ferias;
DROP POLICY IF EXISTS "bh_fer_update"   ON public.banco_horas_ferias;
DROP POLICY IF EXISTS "bh_fer_delete"   ON public.banco_horas_ferias;

-- SELECT: dono OU admin direto OU master da árvore
CREATE POLICY "bh_lanc_select" ON public.banco_horas_lancamentos
FOR SELECT TO authenticated
USING (
    usuario_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = banco_horas_lancamentos.usuario_id
          AND (u.admin_id = auth.uid() OR u.master_id = auth.uid())
    )
);

CREATE POLICY "bh_lanc_insert" ON public.banco_horas_lancamentos
FOR INSERT TO authenticated
WITH CHECK (
    usuario_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = banco_horas_lancamentos.usuario_id
          AND (u.admin_id = auth.uid() OR u.master_id = auth.uid())
    )
);

CREATE POLICY "bh_lanc_update" ON public.banco_horas_lancamentos
FOR UPDATE TO authenticated
USING (
    usuario_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = banco_horas_lancamentos.usuario_id
          AND (u.admin_id = auth.uid() OR u.master_id = auth.uid())
    )
);

CREATE POLICY "bh_lanc_delete" ON public.banco_horas_lancamentos
FOR DELETE TO authenticated
USING (
    usuario_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = banco_horas_lancamentos.usuario_id
          AND (u.admin_id = auth.uid() OR u.master_id = auth.uid())
    )
);

CREATE POLICY "bh_fer_select" ON public.banco_horas_ferias
FOR SELECT TO authenticated
USING (
    usuario_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = banco_horas_ferias.usuario_id
          AND (u.admin_id = auth.uid() OR u.master_id = auth.uid())
    )
);

CREATE POLICY "bh_fer_insert" ON public.banco_horas_ferias
FOR INSERT TO authenticated
WITH CHECK (
    usuario_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = banco_horas_ferias.usuario_id
          AND (u.admin_id = auth.uid() OR u.master_id = auth.uid())
    )
);

CREATE POLICY "bh_fer_update" ON public.banco_horas_ferias
FOR UPDATE TO authenticated
USING (
    usuario_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = banco_horas_ferias.usuario_id
          AND (u.admin_id = auth.uid() OR u.master_id = auth.uid())
    )
);

CREATE POLICY "bh_fer_delete" ON public.banco_horas_ferias
FOR DELETE TO authenticated
USING (
    usuario_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = banco_horas_ferias.usuario_id
          AND (u.admin_id = auth.uid() OR u.master_id = auth.uid())
    )
);
