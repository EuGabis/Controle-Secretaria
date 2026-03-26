import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MessageSquare, ThumbsUp, Wrench, Calendar as CalIcon, User } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function MeusFeedbacksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: feedbacks } = await supabase
    .from('feedbacks')
    .select('*, criador:usuarios!feedbacks_criado_por_fkey(nome)')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })

  const fbList = feedbacks || []

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={26} color="var(--accent-blue)" />
          <span className="text-gradient">Meus Feedbacks</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Acompanhe as avaliações e apontamentos sobre o seu desempenho.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {fbList.length === 0 && (
          <div className="glass" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
            <p>Você ainda não recebeu nenhum feedback.</p>
          </div>
        )}

        {fbList.map(f => (
          <div key={f.id} className="glass" style={{
            padding: '20px', 
            borderTop: `4px solid ${f.tipo === 'positivo' ? 'var(--accent-green)' : 'var(--accent-yellow)'}`,
            display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className={`badge ${f.tipo === 'positivo' ? 'badge-green' : 'badge-yellow'}`} style={{ marginBottom: '8px', display: 'inline-flex' }}>
                  {f.tipo === 'positivo' ? <ThumbsUp size={12}/> : <Wrench size={12}/>}
                  {f.tipo === 'positivo' ? 'Positivo' : 'Construtivo'}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{f.titulo}</h3>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CalIcon size={12} />
                {format(parseISO(f.data_feedback), 'dd/MM/yyyy')}
              </div>
            </div>

            {f.observacao && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                {f.observacao}
              </div>
            )}
            
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginTop: 'auto', paddingTop: '8px' }}>
              Avaliado por: {f.criador?.nome}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
