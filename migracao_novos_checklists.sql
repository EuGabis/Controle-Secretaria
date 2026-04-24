-- =============================================
-- MIGRACAO: ADICIONAR AREAS DE CHECKLIST
-- =============================================

-- 1. Adicionar colunas de categoria se não existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_turmas' AND column_name='categoria') THEN
        ALTER TABLE public.checklist_turmas ADD COLUMN categoria TEXT DEFAULT 'imersao';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_itens' AND column_name='categoria') THEN
        ALTER TABLE public.checklist_itens ADD COLUMN categoria TEXT DEFAULT 'imersao';
    END IF;
END $$;

-- 2. Garantir que registros existentes sejam marcados como 'imersao'
UPDATE public.checklist_turmas SET categoria = 'imersao' WHERE categoria IS NULL;
UPDATE public.checklist_itens SET categoria = 'imersao' WHERE categoria IS NULL;

-- 3. Criar os Modelos Master para as novas áreas
-- ID fixo facilitando a identificação no código
INSERT INTO public.checklist_turmas (id, nome, ativa, categoria)
VALUES ('00000000-0000-0000-0000-000000000001', 'MODELO MASTER INÍCIO', true, 'inicio')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.checklist_turmas (id, nome, ativa, categoria)
VALUES ('00000000-0000-0000-0000-000000000002', 'MODELO MASTER ENCERRAMENTO', true, 'encerramento')
ON CONFLICT (id) DO NOTHING;
