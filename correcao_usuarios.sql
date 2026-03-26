-- =============================================
-- 1. DIAGNÓSTICO: Ver usuários em auth vs usuarios
-- =============================================
SELECT 
  a.id AS auth_id,
  a.email,
  u.id AS perfil_id,
  u.perfil,
  CASE WHEN u.id IS NULL THEN '❌ FALTA em public.usuarios' ELSE '✅ OK' END AS status
FROM auth.users a
LEFT JOIN public.usuarios u ON u.email = a.email;

-- =============================================
-- 2. CORREÇÃO: Sincronizar auth.users → public.usuarios
-- (Re-insert/update todos os usuários auth no perfil)
-- =============================================
INSERT INTO public.usuarios (id, nome, email, perfil)
SELECT 
  a.id,
  COALESCE(a.raw_user_meta_data->>'nome', split_part(a.email, '@', 1)),
  a.email,
  'usuario'
FROM auth.users a
ON CONFLICT (email) DO UPDATE 
  SET id = EXCLUDED.id; -- Atualiza o UUID se mudou

-- =============================================
-- 3. Definir admins novamente
-- =============================================
UPDATE public.usuarios SET perfil = 'admin' 
WHERE email = 'gabriel@avioesemusicas.com';

-- 4. Verificar resultado final
SELECT id, nome, email, perfil FROM public.usuarios ORDER BY perfil DESC, nome;
