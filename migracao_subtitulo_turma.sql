-- =============================================
-- MIGRAÇÃO: SUBTÍTULO NAS TURMAS DE CHECKLIST
-- Executar no Supabase SQL Editor
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='checklist_turmas' AND column_name='subtitulo'
    ) THEN
        ALTER TABLE public.checklist_turmas
        ADD COLUMN subtitulo TEXT;
    END IF;
END $$;
