import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeedbacksClient from '@/components/FeedbacksClient'

export default async function FeedbacksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.perfil !== 'admin' && profile?.perfil !== 'master') {
    redirect('/dashboard')
  }

  // LISTAGEM DE USUÁRIOS PARA FILTRO E ENVIO
  let queryUsr = supabase.from('usuarios').select('id, nome').order('nome')
  if (profile?.perfil === 'master') {
    // Master vê todos os usuários (Admin e Colaboradores) para fins de feedback global
  } else {
    // Admin vê apenas os colaboradores que ele gere
    queryUsr = queryUsr.eq('admin_id', user.id)
  }
  const { data: usuarios } = await queryUsr

  // LISTAGEM DE FEEDBACKS
  let queryFb = supabase
    .from('feedbacks')
    .select('*, usuario:usuarios!feedbacks_usuario_id_fkey(nome), criador:usuarios!feedbacks_criado_por_fkey(nome)')
    .order('created_at', { ascending: false })

  if (profile?.perfil === 'master') {
    // Master vê TODOS os feedbacks do sistema
  } else {
    // Admin vê feedbacks que ele criou
    queryFb = queryFb.eq('criado_por', user.id)
  }

  const { data: feedbacks } = await queryFb

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <FeedbacksClient 
        usuarios={usuarios || []} 
        feedbacks={feedbacks || []} 
        adminId={user.id}
      />
    </div>
  )
}
