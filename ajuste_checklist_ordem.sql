-- =============================================
-- CORREÇÃO DE LÓGICA DE CHECKLIST
-- 1. ADICIONA VÍNCULO ESTÁVEL ENTRE MASTER E TURMAS
-- 2. AJUSTA TRIGGER DE REORDENAMENTO PARA SER LOCAL À TURMA
-- =============================================

-- Adicionar coluna de vínculo se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_itens' AND column_name='master_item_id') THEN
        ALTER TABLE public.checklist_itens ADD COLUMN master_item_id UUID REFERENCES public.checklist_itens(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Vincular itens existentes das turmas aos seus respectivos itens no MASTER (pelo item_n)
UPDATE public.checklist_itens t
SET master_item_id = m.id
FROM public.checklist_itens m
WHERE t.turma_id != '00000000-0000-0000-0000-000000000000'
AND m.turma_id = '00000000-0000-0000-0000-000000000000'
AND t.item_n = m.item_n
AND t.master_item_id IS NULL;

-- Função corrigida de Reordenamento Automático (Localizada por Turma)
CREATE OR REPLACE FUNCTION public.fn_reorder_checklist_itens()
RETURNS TRIGGER AS $$
BEGIN
    -- Só reordenar se o item_n mudou ou é novo
    IF (TG_OP = 'INSERT') OR (NEW.item_n <> OLD.item_n) THEN
        -- "Empurrar" todos os itens daquela turma específica que têm número >= ao novo número
        UPDATE public.checklist_itens
        SET item_n = item_n + 1
        WHERE turma_id = NEW.turma_id
        AND item_n >= NEW.item_n
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropar trigger antigo se existir (tentar nomes comuns) e criar o novo
DROP TRIGGER IF EXISTS tr_reorder_checklist ON public.checklist_itens;
DROP TRIGGER IF EXISTS trg_reorder_checklist ON public.checklist_itens;

CREATE TRIGGER tr_reorder_checklist
    BEFORE INSERT OR UPDATE OF item_n ON public.checklist_itens
    FOR EACH ROW
    WHEN (pg_trigger_depth() < 1) -- Evitar recursão infinita
    EXECUTE FUNCTION public.fn_reorder_checklist_itens();
