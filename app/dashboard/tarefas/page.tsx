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

  let queryUsr = supabase.from('usuarios').select('*').eq('perfil', 'usuario')
  if (profile?.perfil === 'master') queryUsr = queryUsr.eq('master_id', user.id)
  else queryUsr = queryUsr.eq('admin_id', user.id)
  const { data: usuarios } = await queryUsr

  let queryT = supabase.from('tarefas').select('*, usuario:usuarios!inner(*)')
  if (profile?.perfil === 'master') queryT = queryT.eq('usuario.master_id', user.id).order('data_limite', { ascending: true })
  else queryT = queryT.eq('criado_por', user.id).order('data_limite', { ascending: true })
  
  const { data: tarefas } = await queryT

  return (
    <Suspense fallback={<div style={{ padding: '32px', color: 'var(--text-secondary)' }}>Carregando...</div>}>
      <AdminTarefasClient usuarios={usuarios || []} tarefas={tarefas || []} adminId={user.id} />
    </Suspense>
  )
}
