-- =============================================
-- SETUP BANCO DE DADOS — PROJETO SECRETARIA
-- Executar no Supabase SQL Editor
-- =============================================

-- 1. TABELA DE USUÁRIOS (perfis)
-- NOTA: Complementa a tabela auth.users do Supabase
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  perfil TEXT NOT NULL CHECK (perfil IN ('admin', 'usuario')) DEFAULT 'usuario',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE TAREFAS
CREATE TABLE IF NOT EXISTS public.tarefas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_limite DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('a_fazer', 'fazendo', 'feito')) DEFAULT 'a_fazer',
  progresso INTEGER NOT NULL DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  observacao TEXT,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  criado_por UUID REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('individual', 'coletiva')) DEFAULT 'individual',
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  lida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE FOLLOW UP (log de mudanças de status)
CREATE TABLE IF NOT EXISTS public.follow_up_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID REFERENCES public.tarefas(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  status_anterior TEXT NOT NULL,
  status_novo TEXT NOT NULL,
  alterado_em TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_log ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários logados podem ver tudo (controle é feito no app)
CREATE POLICY "Autenticado pode ver usuarios" ON public.usuarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticado pode ver tarefas" ON public.tarefas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin pode inserir tarefas" ON public.tarefas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Autenticado pode editar tarefas" ON public.tarefas
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admin pode excluir tarefas" ON public.tarefas
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Autenticado pode ver notificacoes" ON public.notificacoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin pode inserir notificacoes" ON public.notificacoes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Autenticado pode marcar lida" ON public.notificacoes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Autenticado pode ver follow up" ON public.follow_up_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticado pode inserir follow up" ON public.follow_up_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- TRIGGER: Criar perfil automaticamente no signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'perfil', 'usuario')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ADMINS: Moacir, Juliana, Érica
-- Crie os usuários pelo Supabase Dashboard > Authentication > Users
-- Depois rode:
--   UPDATE public.usuarios SET perfil = 'admin' WHERE email IN ('moacir@...', 'juliana@...', 'erica@...');
-- =============================================
