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
    let queryUsr = supabase.from('usuarios').select('*').eq('perfil', 'usuario')
    if (profile.perfil === 'master') queryUsr = queryUsr.eq('master_id', user.id)
    else queryUsr = queryUsr.eq('admin_id', user.id)
    const { data: usuarios } = await queryUsr

    let queryT = supabase.from('tarefas').select('*, usuario:usuarios!inner(*)')
    if (profile.perfil === 'master') queryT = queryT.eq('usuario.master_id', user.id)
    else queryT = queryT.eq('criado_por', user.id)
    const { data: tarefas } = await queryT

    return <AdminDashboard usuarios={usuarios || []} tarefas={tarefas || []} />
  }

  // Usuário normal → redireciona para kanban
  redirect('/dashboard/minhas-tarefas')
}
