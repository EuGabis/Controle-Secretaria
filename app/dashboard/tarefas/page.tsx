import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminTarefasClient from '@/components/AdminTarefasClient'

export default async function AdminTarefasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (profile?.perfil !== 'admin') redirect('/dashboard/minhas-tarefas')

  const { data: usuarios } = await supabase.from('usuarios').select('*').eq('perfil', 'usuario').eq('admin_id', user.id)
  const { data: tarefas } = await supabase
        .from('tarefas').select('*, usuario:usuarios!usuario_id(*)').eq('criado_por', user.id).order('data_limite', { ascending: true })

  return (
    <Suspense fallback={<div style={{ padding: '32px', color: 'var(--text-secondary)' }}>Carregando...</div>}>
      <AdminTarefasClient usuarios={usuarios || []} tarefas={tarefas || []} adminId={user.id} />
    </Suspense>
  )
}
