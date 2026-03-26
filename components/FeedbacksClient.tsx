'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, MessageSquare, ThumbsUp, Wrench, Calendar as CalIcon, X, User } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FeedbacksClientProps {
  usuarios: any[]
  feedbacks: any[]
  adminId: string
}

export default function FeedbacksClient({ usuarios, feedbacks: initialFeedbacks, adminId }: FeedbacksClientProps) {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const [form, setForm] = useState({
    usuario_id: '',
    titulo: '',
    tipo: 'positivo',
    data_feedback: new Date().toISOString().slice(0, 10),
    observacao: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const obj = {
      ...form,
      criado_por: adminId
    }

    const { data: newF, error } = await supabase
      .from('feedbacks')
      .insert([obj])
      .select('*, usuario:usuarios!feedbacks_usuario_id_fkey(nome), criador:usuarios!feedbacks_criado_por_fkey(nome)')
      .single()

    if (error) {
      alert('Erro ao salvar feedback: ' + error.message)
    } else if (newF) {
      setFeedbacks([newF, ...feedbacks])
      setIsModalOpen(false)
      setForm({
        usuario_id: '',
        titulo: '',
        tipo: 'positivo',
        data_feedback: new Date().toISOString().slice(0, 10),
        observacao: ''
      })
    }
    setLoading(false)
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={26} color="var(--accent-blue)" />
            <span className="text-gradient">Feedbacks da Equipe</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Registre apontamentos positivos e construtivos para o seu time.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Novo Feedback
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {feedbacks.length === 0 && (
          <div className="glass" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
            <p>Nenhum feedback registrado.</p>
          </div>
        )}

        {feedbacks.map(f => (
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={14} color="var(--text-muted)"/>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Para</div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>{f.usuario?.nome}</div>
              </div>
            </div>

            {f.observacao && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                {f.observacao}
              </div>
            )}
            
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginTop: 'auto', paddingTop: '8px' }}>
              Lançado por: {f.criador?.nome}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass modal-glass" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-sidebar)', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Criar Feedback</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Colaborador</label>
                <select 
                  required
                  className="input-field"
                  value={form.usuario_id}
                  onChange={e => setForm({...form, usuario_id: e.target.value})}
                >
                  <option value="" disabled>Selecione um colaborador</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Tipo do Feedback</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setForm({...form, tipo: 'positivo'})}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      border: `1px solid ${form.tipo === 'positivo' ? 'var(--accent-green)' : 'var(--border)'}`,
                      background: form.tipo === 'positivo' ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)',
                      color: form.tipo === 'positivo' ? 'var(--accent-green)' : 'var(--text-secondary)',
                      fontWeight: '600', cursor: 'pointer', transition: '0.2s'
                    }}
                  >
                    <ThumbsUp size={16}/> Positivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({...form, tipo: 'construtivo'})}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      border: `1px solid ${form.tipo === 'construtivo' ? 'var(--accent-yellow)' : 'var(--border)'}`,
                      background: form.tipo === 'construtivo' ? 'rgba(245,158,11,0.1)' : 'var(--bg-card)',
                      color: form.tipo === 'construtivo' ? 'var(--accent-yellow)' : 'var(--text-secondary)',
                      fontWeight: '600', cursor: 'pointer', transition: '0.2s'
                    }}
                  >
                    <Wrench size={16}/> Construtivo
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Título</label>
                <input 
                  type="text" required className="input-field" 
                  placeholder="Ex: Excelente atendimento, Atraso nas reuniões..."
                  value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Data do Feedback</label>
                <input 
                  type="date" required className="input-field" 
                  value={form.data_feedback} onChange={e => setForm({...form, data_feedback: e.target.value})}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Observação (Opcional)</label>
                <textarea 
                  className="input-field" 
                  placeholder="Detalhes ou plano de ação..."
                  rows={3}
                  value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Salvando...' : 'Salvar Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
