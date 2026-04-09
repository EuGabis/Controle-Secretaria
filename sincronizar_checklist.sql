-- =============================================
-- SINCRONIZAÇÃO E LIMPEZA DE ETAPAS
-- Finalidade: Corrigir discrepâncias de contagem e remover órfãos
-- =============================================

-- 1. Remover itens que não pertencem nem ao MASTER nem a nenhuma TURMA válida
DELETE FROM public.checklist_itens 
WHERE turma_id NOT IN (SELECT id FROM public.checklist_turmas)
AND turma_id <> '00000000-0000-0000-0000-000000000000';

-- 2. Garantir que todos os itens em turmas que têm o mesmo nome/número do Master sejam vinculados
UPDATE public.checklist_itens t
SET master_item_id = m.id
FROM public.checklist_itens m
WHERE t.turma_id != '00000000-0000-0000-0000-000000000000'
AND m.turma_id = '00000000-0000-0000-0000-000000000000'
AND t.item_n = m.item_n
AND t.master_item_id IS NULL;

-- 3. Identificar itens que estão sobrando nas turmas mas não existem no Master (opcional: remover se quiser sincronia total)
-- DELETE FROM public.checklist_itens 
-- WHERE turma_id != '00000000-0000-0000-0000-000000000000' 
-- AND master_item_id IS NULL;

-- 4. Reordenar item_n para remover gaps (buracos na numeração) dentro de cada turma
-- Isso garante que se houver 45 itens, eles sejam numerados de 1 a 45.
WITH reordered AS (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY turma_id ORDER BY item_n, created_at) as new_n
    FROM public.checklist_itens
)
UPDATE public.checklist_itens i
SET item_n = r.new_n
FROM reordered r
WHERE i.id = r.id;

-- 5. Atualizar ordem para bater com item_n
UPDATE public.checklist_itens SET ordem = item_n;
