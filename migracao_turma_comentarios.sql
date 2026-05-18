-- =============================================
-- MIGRAÇÃO: COMENTÁRIOS POR TURMA DE CHECKLIST
-- - Cada turma tem sua thread de comentários independente
-- - Quando uma turma nova é criada (clone), NÃO copia comentários
-- Executar no Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS public.checklist_turma_comentarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    turma_id UUID REFERENCES public.checklist_turmas(id) ON DELETE CASCADE NOT NULL,
    autor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    autor_nome TEXT,
    mensagem TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctc_turma ON public.checklist_turma_comentarios(turma_id, created_at);

ALTER TABLE public.checklist_turma_comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ctc_select" ON public.checklist_turma_comentarios;
DROP POLICY IF EXISTS "ctc_insert" ON public.checklist_turma_comentarios;
DROP POLICY IF EXISTS "ctc_delete" ON public.checklist_turma_comentarios;
DROP POLICY IF EXISTS "ctc_update" ON public.checklist_turma_comentarios;

-- Qualquer autenticado lê e adiciona
CREATE POLICY "ctc_select" ON public.checklist_turma_comentarios
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ctc_insert" ON public.checklist_turma_comentarios
    FOR INSERT TO authenticated
    WITH CHECK (autor_id = auth.uid());

-- Apenas o próprio autor OU admin/master apaga
CREATE POLICY "ctc_delete" ON public.checklist_turma_comentarios
    FOR DELETE TO authenticated
    USING (
        autor_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.perfil IN ('admin','master'))
    );

CREATE POLICY "ctc_update" ON public.checklist_turma_comentarios
    FOR UPDATE TO authenticated
    USING (autor_id = auth.uid());
