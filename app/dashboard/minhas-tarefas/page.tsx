import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KanbanBoard from '@/components/KanbanBoard'

export default async function MinhasTarefasPage(props: { searchParams?: Promise<{ tipo?: string }> }) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const tipo = searchParams?.tipo;
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('usuarios').select('*').eq('id', user.id).single()

  let query = supabase
    .from('tarefas')
    .select('*')
    .eq('usuario_id', user.id)
    .order('data_limite', { ascending: true })

  if (tipo) {
    query = query.eq('tipo', tipo)
  }

  const { data: tarefas } = await query

  const tipoLabels: Record<string, string> = {
    'diaria': 'Diárias',
    'semanal': 'Semanais',
    'mensal': 'Mensais',
    'rotativa': 'Rotativas'
  }
  const filterLabel = tipo ? ` (${tipoLabels[tipo] || tipo})` : ''

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="text-gradient" style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>
          Minhas Tarefas{filterLabel}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Olá, <strong>{profile?.nome}</strong>! Aqui estão as tarefas atribuídas a você.
        </p>
      </div>

      <KanbanBoard tarefas={tarefas || []} isAdmin={false} />
    </div>
  )
}
