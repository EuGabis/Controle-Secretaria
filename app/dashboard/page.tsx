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
      // O Admin vê os 'usuários' subordinados + a si mesmo
      queryUsr = queryUsr.or(`id.eq.${user.id},and(perfil.eq.usuario,admin_id.eq.${user.id})`)
    }
    const { data: usuarios } = await queryUsr

    const userIds = usuarios?.map(u => u.id) || []
    let queryT = supabase.from('tarefas').select('*, usuario:usuarios!usuario_id(*)')
    
    if (profile.perfil === 'master') {
      // Master vê TUDO (userIds já contém todos se for master)
      // Mas para garantir que pegamos até tarefas com usuario_id nulo se existirem:
      queryT = queryT.order('data_limite', { ascending: true })
    } else {
      // Admin vê tarefas atribuídas a ele ou aos seus subordinados (userIds já inclui o Admin)
      const listStr = userIds.length > 0 ? userIds.join(',') : user.id
      queryT = queryT.or(`usuario_id.in.(${listStr}),criado_por.eq.${user.id}`).order('data_limite', { ascending: true })
    }
    const { data: tarefas } = await queryT


    return <AdminDashboard usuarios={usuarios || []} tarefas={tarefas || []} currentUserId={user.id} />
  }

  // Usuário normal → redireciona para kanban
  redirect('/dashboard/minhas-tarefas')
}
