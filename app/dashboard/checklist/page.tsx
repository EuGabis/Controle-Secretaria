import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChecklistClient from '@/components/ChecklistClient'

export default async function ChecklistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  // Buscar Itens, Turmas e Respostas
  const [
    { data: itens },
    { data: turmas },
    { data: respostas }
  ] = await Promise.all([
    supabase.from('checklist_itens').select('*').order('ordem', { ascending: true }),
    supabase.from('checklist_turmas').select('*').order('created_at', { ascending: true }),
    supabase.from('checklist_respostas').select('*')
  ])

  return (
    <div style={{ padding: '32px' }}>
      <ChecklistClient 
        itens={itens || []} 
        turmas={turmas || []} 
        respostas={respostas || []} 
        perfil={profile?.perfil || 'usuario'}
        usuarioId={user.id}
      />
    </div>
  )
}
