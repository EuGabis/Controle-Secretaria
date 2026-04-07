import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowUpDown } from 'lucide-react'
import FollowUpUserFilter from '@/components/FollowUpUserFilter'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function FollowUpPage(props: Props) {
  const searchParams = await props.searchParams
  const usuarioFiltro = typeof searchParams.usuario === 'string' ? searchParams.usuario : undefined

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (profile?.perfil !== 'admin' && profile?.perfil !== 'master') redirect('/dashboard')

  let queryUsr = supabase.from('usuarios').select('id, nome').order('nome')
  if (profile?.perfil === 'master') {
    // Master vê todos os colaboradores possíveis para filtrar
  } else {
    // Admin vê si mesmo e seus subordinados
    queryUsr = queryUsr.or(`id.eq.${user.id},admin_id.eq.${user.id}`)
  }
  const { data: usuarios } = await queryUsr
  const userIds = (usuarios || []).map(u => u.id)

  const hoje = new Date().toISOString().slice(0, 10)

  // Query base do Follow Up
  let query = supabase
    .from('follow_up_log')
    .select('*, tarefa:tarefas!inner(titulo), usuario:usuarios!inner(nome)')
    .gte('alterado_em', `${hoje}T00:00:00`)
    .order('alterado_em', { ascending: false })

  if (profile?.perfil === 'master') {
    // Master vê todos os logs de hoje sem filtro adicional
  } else {
    // Admin vê logs de si mesmo e de seus subordinados (quem moveu a tarefa)
    const listStr = userIds.length > 0 ? userIds.join(',') : user.id
    query = query.filter('usuario_id', 'in', `(${listStr})`)
  }


  if (usuarioFiltro) {
    query = query.eq('usuario_id', usuarioFiltro)
  }

  const { data: logs } = await query

  const statusLabel: Record<string, string> = {
    a_fazer: '📋 A Fazer',
    fazendo: '🔄 Fazendo',
    feito: '✅ Feito',
  }
  const statusColor: Record<string, string> = {
    a_fazer: 'badge-gray',
    fazendo: 'badge-blue',
    feito: 'badge-green',
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ArrowUpDown size={24} color="var(--accent-blue)" />
          <span className="text-gradient">Follow Up</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Movimentações de tarefas de hoje — {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <FollowUpUserFilter usuarios={usuarios || []} />

      {logs && logs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {logs.map((log: any) => (
            <div key={log.id} className="glass" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '40px', height: '40px', flexShrink: 0,
                background: 'rgba(79,124,255,0.12)', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px',
              }}>
                {log.usuario?.nome?.charAt(0) || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                  {log.usuario?.nome}
                  <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}> moveu </span>
                  <span style={{ color: 'var(--accent-blue)' }}>{log.tarefa?.titulo}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className={`badge ${statusColor[log.status_anterior as string]}`}>
                    {statusLabel[log.status_anterior as string]}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>→</span>
                  <span className={`badge ${statusColor[log.status_novo as string]}`}>
                    {statusLabel[log.status_novo as string]}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                {format(parseISO(log.alterado_em), 'HH:mm', { locale: ptBR })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <ArrowUpDown size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
          <p>Nenhuma movimentação hoje ainda.</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>As atualizações de status aparecerão aqui.</p>
        </div>
      )}
    </div>
  )
}
