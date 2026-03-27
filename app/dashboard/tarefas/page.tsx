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
    // Admin vê apenas Usuários sob sua responsabilidade
    queryUsr = queryUsr.eq('perfil', 'usuario').eq('admin_id', user.id)
  }
  const { data: usuarios } = await queryUsr

  const userIds = usuarios?.map(u => u.id) || []
  let queryT = supabase.from('tarefas').select('*, usuario:usuarios!usuario_id(*)').order('data_limite', { ascending: true })
  
  if (profile?.perfil === 'master') {
    // Master vê todas as tarefas do sistema
  } else {
    queryT = queryT.eq('criado_por', user.id)
  }
  
  const { data: tarefas } = await queryT

  return (
    <Suspense fallback={<div style={{ padding: '32px', color: 'var(--text-secondary)' }}>Carregando...</div>}>
      <AdminTarefasClient usuarios={usuarios || []} tarefas={tarefas || []} adminId={user.id} />
    </Suspense>
  )
}
