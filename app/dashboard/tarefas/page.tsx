import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminTarefasClient from '@/components/AdminTarefasClient'

export default async function AdminTarefasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (profile?.perfil !== 'admin' && profile?.perfil !== 'master') redirect('/dashboard/minhas-tarefas')

  let queryUsr = supabase.from('usuarios').select('*')
  if (profile?.perfil === 'master') {
    // Master tem visão global de usuários
  } else {
    // Admin vê seus 'usuários' subordinados + a si mesmo
    queryUsr = queryUsr.or(`id.eq.${user.id},and(perfil.eq.usuario,admin_id.eq.${user.id})`)
  }
  const { data: usuarios } = await queryUsr

  const userIds = usuarios?.map(u => u.id) || []
  let queryT = supabase.from('tarefas').select('*, usuario:usuarios!usuario_id(*)').order('data_limite', { ascending: true })
  
  if (profile?.perfil === 'master') {
    // Master vê todas as tarefas do sistema
  } else {
    // Admin vê tarefas atribuídas a ele ou aos seus subordinados (userIds já inclui o Admin)
    const listStr = userIds.length > 0 ? userIds.join(',') : user.id
    queryT = queryT.or(`usuario_id.in.(${listStr}),criado_por.eq.${user.id}`)
  }

  
  const { data: tarefas } = await queryT

  return (
    <Suspense fallback={<div style={{ padding: '32px', color: 'var(--text-secondary)' }}>Carregando...</div>}>
      <AdminTarefasClient usuarios={usuarios || []} tarefas={tarefas || []} adminId={user.id} />
    </Suspense>
  )
}
