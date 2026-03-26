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

  if (profile?.perfil === 'admin') {
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('*')
      .eq('perfil', 'usuario')

    const { data: tarefas } = await supabase
      .from('tarefas')
      .select('*, usuario:usuarios!usuario_id(*)')

    return <AdminDashboard usuarios={usuarios || []} tarefas={tarefas || []} />
  }

  // Usuário normal → redireciona para kanban
  redirect('/dashboard/minhas-tarefas')
}
