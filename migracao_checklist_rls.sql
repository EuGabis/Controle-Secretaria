-- =============================================
-- MIGRAÇÃO: GARANTIR RLS DE CHECKLIST PERMITE UPDATE
-- (Resolve subtítulo / nome / descrição da turma sumindo após F5)
-- Executar no Supabase SQL Editor
-- =============================================

-- checklist_turmas
ALTER TABLE public.checklist_turmas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_turmas_select" ON public.checklist_turmas;
DROP POLICY IF EXISTS "checklist_turmas_insert" ON public.checklist_turmas;
DROP POLICY IF EXISTS "checklist_turmas_update" ON public.checklist_turmas;
DROP POLICY IF EXISTS "checklist_turmas_delete" ON public.checklist_turmas;
DROP POLICY IF EXISTS "checklist_turmas_all"    ON public.checklist_turmas;

CREATE POLICY "checklist_turmas_all" ON public.checklist_turmas
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- checklist_itens
ALTER TABLE public.checklist_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_itens_select" ON public.checklist_itens;
DROP POLICY IF EXISTS "checklist_itens_insert" ON public.checklist_itens;
DROP POLICY IF EXISTS "checklist_itens_update" ON public.checklist_itens;
DROP POLICY IF EXISTS "checklist_itens_delete" ON public.checklist_itens;
DROP POLICY IF EXISTS "checklist_itens_all"    ON public.checklist_itens;

CREATE POLICY "checklist_itens_all" ON public.checklist_itens
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- checklist_respostas
ALTER TABLE public.checklist_respostas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_respostas_select" ON public.checklist_respostas;
DROP POLICY IF EXISTS "checklist_respostas_insert" ON public.checklist_respostas;
DROP POLICY IF EXISTS "checklist_respostas_update" ON public.checklist_respostas;
DROP POLICY IF EXISTS "checklist_respostas_delete" ON public.checklist_respostas;
DROP POLICY IF EXISTS "checklist_respostas_all"    ON public.checklist_respostas;

CREATE POLICY "checklist_respostas_all" ON public.checklist_respostas
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);
