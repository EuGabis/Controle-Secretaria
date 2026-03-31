'use client'

import { useState, useMemo } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta, Usuario } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Check, X, Loader2, Info } from 'lucide-react'

interface Props {
  itens: ChecklistItem[]
  turmas: ChecklistTurma[]
  respostas: ChecklistResposta[]
  perfil: string
  usuarioId: string
}

export default function ChecklistClient({ itens: initialItens, turmas: initialTurmas, respostas: initialRespostas, perfil, usuarioId }: Props) {
  const [itens, setItens] = useState(initialItens)
  const [turmas, setTurmas] = useState(initialTurmas)
  const [respostas, setRespostas] = useState(initialRespostas)
  const [loading, setLoading] = useState<string | null>(null)
  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  // Mapeamento para acesso rápido às respostas [itemId-turmaId]
  const respostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.forEach(r => {
      map[`${r.item_id}-${r.turma_id}`] = r
    })
    return map
  }, [respostas])

  const handleToggleStatus = async (itemId: string, turmaId: string) => {
    const key = `${itemId}-${turmaId}`
    const atual = respostasMap[key]
    const loadingKey = `toggle-${key}`
    setLoading(loadingKey)

    const proximos: Record<string, 'OK' | 'N/A' | 'PENDENTE'> = {
      'PENDENTE': 'OK',
      'OK': 'N/A',
      'N/A': 'PENDENTE'
    }
    const novoStatus = atual ? proximos[atual.status] : 'OK'

    if (atual) {
      const { data, error } = await supabase
        .from('checklist_respostas')
        .update({ status: novoStatus, respondido_por: usuarioId, updated_at: new Date().toISOString() })
        .eq('id', atual.id)
        .select()
        .single()

      if (!error && data) {
        setRespostas(prev => prev.map(r => r.id === atual.id ? { ...r, ...data } : r))
      }
    } else {
      const { data, error } = await supabase
        .from('checklist_respostas')
        .insert({ item_id: itemId, turma_id: turmaId, status: novoStatus, respondido_por: usuarioId })
        .select()
        .single()

      if (!error && data) {
        setRespostas(prev => [...prev, data])
      }
    }
    setLoading(null)
  }

  const handleAddItem = async () => {
    if (!isAdmin) return
    const titulo = prompt('Título do novo item de checklist:')
    if (!titulo) return

    const { data, error } = await supabase
      .from('checklist_itens')
      .insert({ titulo, ordem: itens.length })
      .select()
      .single()

    if (!error && data) {
      setItens(prev => [...prev, data])
    }
  }

  const handleAddTurma = async () => {
    if (!isAdmin) return
    const nome = prompt('Nome da nova Turma (ex: TBC JULHO):')
    if (!nome) return

    const { data, error } = await supabase
      .from('checklist_turmas')
      .insert({ nome })
      .select()
      .single()

    if (!error && data) {
      setTurmas(prev => [...prev, data])
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!isAdmin || !confirm('Excluir este item de todos os checklists?')) return
    const { error } = await supabase.from('checklist_itens').delete().eq('id', id)
    if (!error) setItens(prev => prev.filter(i => i.id !== id))
  }

  const handleDeleteTurma = async (id: string) => {
    if (!isAdmin || !confirm('Excluir esta turma e todos os seus registros de checklist?')) return
    const { error } = await supabase.from('checklist_turmas').delete().eq('id', id)
    if (!error) setTurmas(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Checklist MMA</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Acompanhamento de processos por turma</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={handleAddItem} style={{ fontSize: '12px', padding: '8px 12px' }}>
              <Plus size={14} /> Novo Item (Linha)
            </button>
            <button className="btn-primary" onClick={handleAddTurma} style={{ fontSize: '12px', padding: '8px 12px' }}>
              <Plus size={14} /> Nova Turma (Coluna)
            </button>
          </div>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid var(--border)', position: 'sticky', left: 0, background: 'rgba(20,20,30,0.95)', zIndex: 10 }}>
              Processo / Tarefa
            </th>
            {turmas.map(t => (
              <th key={t.id} style={{ padding: '16px', borderBottom: '1px solid var(--border)', minWidth: '120px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>{t.nome}</span>
                  {isAdmin && (
                    <button onClick={() => handleDeleteTurma(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.5 }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itens.map((item, idx) => (
            <tr key={item.id} style={{ transition: 'background 0.2s' }} className="table-row-hover">
              <td style={{ 
                padding: '16px', 
                borderBottom: '1px solid var(--border)', 
                position: 'sticky', 
                left: 0, 
                background: 'rgba(20,20,30,0.95)', 
                zIndex: 5,
                fontSize: '13px',
                fontWeight: '500'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{idx + 1}.</span>
                  <span>{item.titulo}</span>
                  {isAdmin && (
                    <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.3 }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              </td>
              {turmas.map(turma => {
                const resp = respostasMap[`${item.id}-${turma.id}`]
                const isLoading = loading === `toggle-${item.id}-${turma.id}`
                
                return (
                  <td key={turma.id} style={{ padding: '8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleStatus(item.id, turma.id)}
                      disabled={isLoading}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: resp?.status === 'OK' ? 'rgba(16,217,140,0.2)' : 
                                   resp?.status === 'N/A' ? 'rgba(255,255,255,0.05)' : 
                                   'transparent',
                        color: resp?.status === 'OK' ? 'var(--accent-green)' : 
                               resp?.status === 'N/A' ? 'var(--text-muted)' : 
                               'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        transition: 'all 0.2s',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}
                    >
                      {isLoading ? <Loader2 size={14} className="spin" /> : (
                        resp?.status === 'OK' ? <Check size={18} /> :
                        resp?.status === 'N/A' ? 'N/A' :
                        null
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {itens.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          Nenhum item configurado. {isAdmin && 'Clique em "Novo Item" para começar.'}
        </div>
      )}

      <style jsx>{`
        .table-row-hover:hover td {
          background: rgba(255,255,255,0.02) !important;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
