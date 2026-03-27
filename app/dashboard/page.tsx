import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/AdminDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.perfil === 'admin' || profile?.perfil === 'master') {
    // Para Master, queremos ver tanto Admins quanto Usuários
    let queryUsr = supabase.from('usuarios').select('*')
    
    if (profile.perfil === 'master') {
      // O Master vê TODOS os usuários do sistema (Global)
    } else {
      // O Admin vê apenas os 'usuários' subordinados a ele
      queryUsr = queryUsr.eq('perfil', 'usuario').eq('admin_id', user.id)
    }
    const { data: usuarios } = await queryUsr

    const userIds = usuarios?.map(u => u.id) || []
    let queryT = supabase.from('tarefas').select('*, usuario:usuarios!usuario_id(*)')
    
    if (profile.perfil === 'master') {
      queryT = queryT.in('usuario_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])
    } else {
      queryT = queryT.eq('criado_por', user.id)
    }
    const { data: tarefas } = await queryT

    return <AdminDashboard usuarios={usuarios || []} tarefas={tarefas || []} />
  }

  // Usuário normal → redireciona para kanban
  redirect('/dashboard/minhas-tarefas')
}
