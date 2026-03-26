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

  // Master vê feedbacks de todos subordinados (Admin + master). 
  // Para simplificar, Master / Admin podem ver os usuários sob seu controle.
  let queryUsr = supabase.from('usuarios').select('id, nome')
  if (profile?.perfil === 'master') {
    queryUsr = queryUsr.eq('master_id', user.id)
  } else {
    queryUsr = queryUsr.eq('admin_id', user.id)
  }
  const { data: usuarios } = await queryUsr

  // Buscar Feedbacks criados por esse Admin/Master
  // Na verdade, Mestre pode ver todos os feedbacks criados "na sua franquia".
  // Vamos buscar feedbacks baseados na mesma lógica:
  let queryFb = supabase
    .from('feedbacks')
    .select('*, usuario:usuarios!feedbacks_usuario_id_fkey(nome), criador:usuarios!feedbacks_criado_por_fkey(nome)')
    .order('created_at', { ascending: false })

  if (profile?.perfil === 'master') {
    // Busca feedbacks onde o 'criado_por' é ele mesmo ou um de seus Admins (cujo admin_id ou master_id = user.id)
    // Para simplificar via Supabase RPC/Join, pegaremos os feedbacks onde o usuário avaliado pertence a essa franquia.
    queryFb = queryFb.in('usuario_id', (usuarios || []).map(u => u.id))
  } else {
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
