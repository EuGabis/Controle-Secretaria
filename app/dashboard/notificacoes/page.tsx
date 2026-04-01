import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificacoesClient from '@/components/NotificacoesClient'

export default async function NotificacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  
  // Master também é considerado Admin para fins de envio de notificações
  const isAdmin = profile?.perfil === 'admin' || profile?.perfil === 'master'

  // Para Master, listamos todos os usuários. Para Admin, listamos colaboradores.
  const { data: usuarios } = isAdmin
    ? await supabase.from('usuarios').select('*').eq('perfil', 'usuario')
    : { data: [] }

  const query = supabase
    .from('notificacoes')
    .select('*')
    .order('created_at', { ascending: false })

  if (!isAdmin) query.or(`usuario_id.eq.${user.id},tipo.eq.coletiva`)

  const { data: notificacoes } = await query

  // Buscar respostas de todas as notificações relevantes
  const notifIds = (notificacoes || []).map(n => n.id)
  const { data: respostas } = notifIds.length > 0
    ? await supabase
        .from('respostas_notificacoes')
        .select('*, autor:usuarios!de_usuario_id(id, nome, perfil)')
        .in('notificacao_id', notifIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  return (
    <Suspense fallback={<div style={{ padding: '32px', color: 'var(--text-secondary)' }}>Carregando...</div>}>
      <NotificacoesClient
        notificacoes={notificacoes || []}
        respostas={respostas || []}
        usuarios={usuarios || []}
        isAdmin={isAdmin}
        userId={user.id}
      />
    </Suspense>
  )
}
