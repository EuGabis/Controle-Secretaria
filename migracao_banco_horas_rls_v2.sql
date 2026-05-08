-- =============================================
-- MIGRAÇÃO V2: RLS Banco de Horas
-- - Master enxerga TUDO (sem precisar de hierarquia setada)
-- - Admin enxerga subordinados (admin_id ou master_id apontando pra ele)
-- - Usuário comum enxerga só os próprios registros
-- Idempotente — pode rodar várias vezes
-- =============================================

-- Lançamentos
DROP POLICY IF EXISTS "bh_lanc_select" ON public.banco_horas_lancamentos;
DROP POLICY IF EXISTS "bh_lanc_insert" ON public.banco_horas_lancamentos;
DROP POLICY IF EXISTS "bh_lanc_update" ON public.banco_horas_lancamentos;
DROP POLICY IF EXISTS "bh_lanc_delete" ON public.banco_horas_lancamentos;

CREATE POLICY "bh_lanc_select" ON public.banco_horas_lancamentos
FOR SELECT TO authenticated
USING (
    usuario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.usuarios me WHERE me.id = auth.uid() AND me.perfil = 'master')
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
    OR EXISTS (SELECT 1 FROM public.usuarios me WHERE me.id = auth.uid() AND me.perfil = 'master')
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
    OR EXISTS (SELECT 1 FROM public.usuarios me WHERE me.id = auth.uid() AND me.perfil = 'master')
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
    OR EXISTS (SELECT 1 FROM public.usuarios me WHERE me.id = auth.uid() AND me.perfil = 'master')
    OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = banco_horas_lancamentos.usuario_id
          AND (u.admin_id = auth.uid() OR u.master_id = auth.uid())
    )
);

-- Férias
DROP POLICY IF EXISTS "bh_fer_select" ON public.banco_horas_ferias;
DROP POLICY IF EXISTS "bh_fer_insert" ON public.banco_horas_ferias;
DROP POLICY IF EXISTS "bh_fer_update" ON public.banco_horas_ferias;
DROP POLICY IF EXISTS "bh_fer_delete" ON public.banco_horas_ferias;

CREATE POLICY "bh_fer_select" ON public.banco_horas_ferias
FOR SELECT TO authenticated
USING (
    usuario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.usuarios me WHERE me.id = auth.uid() AND me.perfil = 'master')
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
    OR EXISTS (SELECT 1 FROM public.usuarios me WHERE me.id = auth.uid() AND me.perfil = 'master')
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
    OR EXISTS (SELECT 1 FROM public.usuarios me WHERE me.id = auth.uid() AND me.perfil = 'master')
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
    OR EXISTS (SELECT 1 FROM public.usuarios me WHERE me.id = auth.uid() AND me.perfil = 'master')
    OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = banco_horas_ferias.usuario_id
          AND (u.admin_id = auth.uid() OR u.master_id = auth.uid())
    )
);
