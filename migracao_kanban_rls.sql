-- =============================================
-- MIGRAÇÃO: GARANTIR RLS DE TAREFAS / FOLLOW_UP_LOG PERMITE DRAG-AND-DROP
-- (Resolve cards do Kanban não movendo silenciosamente)
-- Executar no Supabase SQL Editor
-- =============================================

-- tarefas: qualquer authenticated pode ler / inserir / atualizar / excluir
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticado pode ver tarefas"      ON public.tarefas;
DROP POLICY IF EXISTS "Admin pode inserir tarefas"        ON public.tarefas;
DROP POLICY IF EXISTS "Autenticado pode editar tarefas"   ON public.tarefas;
DROP POLICY IF EXISTS "Admin pode excluir tarefas"        ON public.tarefas;
DROP POLICY IF EXISTS "tarefas_all"                       ON public.tarefas;

CREATE POLICY "tarefas_all" ON public.tarefas
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- follow_up_log: insert/select aberto para authenticated
ALTER TABLE public.follow_up_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticado pode ver follow up"      ON public.follow_up_log;
DROP POLICY IF EXISTS "Autenticado pode inserir follow up"  ON public.follow_up_log;
DROP POLICY IF EXISTS "follow_up_log_all"                   ON public.follow_up_log;

CREATE POLICY "follow_up_log_all" ON public.follow_up_log
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);
