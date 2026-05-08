'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BancoHorasLancamento, BancoHorasFerias } from '@/lib/types'
import { Clock, Plus, Trash2, Save, Loader2, Plane, User as UserIcon } from 'lucide-react'

interface Props {
  currentUserId: string
  targetUserId: string
  targetUserNome: string
  isAdmin: boolean
  usuariosLista: { id: string; nome: string; banco_horas_liberado: boolean }[]
  lancamentos: BancoHorasLancamento[]
  ferias: BancoHorasFerias[]
}

type DraftLanc = Partial<BancoHorasLancamento> & { _draft?: boolean; _localId?: string }
type DraftFer = Partial<BancoHorasFerias> & { _draft?: boolean; _localId?: string }

export default function BancoHorasClient({
  targetUserId, targetUserNome, isAdmin, usuariosLista,
  lancamentos: initialLancamentos, ferias: initialFerias
}: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [lancamentos, setLancamentos] = useState<DraftLanc[]>(initialLancamentos)
  const [ferias, setFerias] = useState<DraftFer[]>(initialFerias)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    setLancamentos(initialLancamentos)
    setFerias(initialFerias)
  }, [initialLancamentos, initialFerias, targetUserId])

  // ========== LANÇAMENTOS ==========
  const addLanc = () => {
    const localId = `local-${Date.now()}`
    const ordem = (lancamentos[lancamentos.length - 1]?.ordem ?? -1) + 1
    setLancamentos(prev => [...prev, {
      _draft: true, _localId: localId,
      usuario_id: targetUserId, data: '', horas: '', em_haver: '', observacao: '',
      ordem
    }])
  }

  const updateLanc = (id: string, field: keyof BancoHorasLancamento, value: string) => {
    setLancamentos(prev => prev.map(l => {
      const key = (l._draft ? l._localId : l.id) as string
      return key === id ? { ...l, [field]: value } : l
    }))
  }

  const saveLanc = async (item: DraftLanc) => {
    const localKey = (item._draft ? item._localId : item.id) as string
    setSavingId(localKey)
    try {
      if (item._draft) {
        const { data, error } = await supabase.from('banco_horas_lancamentos').insert({
          usuario_id: targetUserId,
          data: item.data || null,
          horas: item.horas || null,
          em_haver: item.em_haver || null,
          observacao: item.observacao || null,
          ordem: item.ordem ?? 0
        }).select().single()
        if (error) throw error
        if (data) {
          setLancamentos(prev => prev.map(l => l._localId === item._localId ? data : l))
        }
      } else {
        const { error } = await supabase.from('banco_horas_lancamentos').update({
          data: item.data || null,
          horas: item.horas || null,
          em_haver: item.em_haver || null,
          observacao: item.observacao || null,
          updated_at: new Date().toISOString()
        }).eq('id', item.id!)
        if (error) throw error
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar lançamento')
    } finally {
      setSavingId(null)
    }
  }

  const deleteLanc = async (item: DraftLanc) => {
    if (item._draft) {
      setLancamentos(prev => prev.filter(l => l._localId !== item._localId))
      return
    }
    if (!confirm('Excluir este lançamento?')) return
    const { error } = await supabase.from('banco_horas_lancamentos').delete().eq('id', item.id!)
    if (error) { alert('Erro ao excluir'); return }
    setLancamentos(prev => prev.filter(l => l.id !== item.id))
  }

  // ========== FÉRIAS ==========
  const addFer = () => {
    const localId = `local-${Date.now()}`
    const ordem = (ferias[ferias.length - 1]?.ordem ?? -1) + 1
    setFerias(prev => [...prev, {
      _draft: true, _localId: localId,
      usuario_id: targetUserId, descricao: '', dias: '', periodo: '', status: '',
      ordem
    }])
  }

  const updateFer = (id: string, field: keyof BancoHorasFerias, value: string) => {
    setFerias(prev => prev.map(f => {
      const key = (f._draft ? f._localId : f.id) as string
      return key === id ? { ...f, [field]: value } : f
    }))
  }

  const saveFer = async (item: DraftFer) => {
    const localKey = (item._draft ? item._localId : item.id) as string
    setSavingId(localKey)
    try {
      if (item._draft) {
        const { data, error } = await supabase.from('banco_horas_ferias').insert({
          usuario_id: targetUserId,
          descricao: item.descricao || null,
          dias: item.dias || null,
          periodo: item.periodo || null,
          status: item.status || null,
          ordem: item.ordem ?? 0
        }).select().single()
        if (error) throw error
        if (data) {
          setFerias(prev => prev.map(f => f._localId === item._localId ? data : f))
        }
      } else {
        const { error } = await supabase.from('banco_horas_ferias').update({
          descricao: item.descricao || null,
          dias: item.dias || null,
          periodo: item.periodo || null,
          status: item.status || null,
          updated_at: new Date().toISOString()
        }).eq('id', item.id!)
        if (error) throw error
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar férias')
    } finally {
      setSavingId(null)
    }
  }

  const deleteFer = async (item: DraftFer) => {
    if (item._draft) {
      setFerias(prev => prev.filter(f => f._localId !== item._localId))
      return
    }
    if (!confirm('Excluir esta linha de férias?')) return
    const { error } = await supabase.from('banco_horas_ferias').delete().eq('id', item.id!)
    if (error) { alert('Erro ao excluir'); return }
    setFerias(prev => prev.filter(f => f.id !== item.id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px' }}>
      {/* HEADER */}
      <div className="glass" style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px', height: '48px',
            background: 'linear-gradient(135deg, #4f7cff, #8b5cf6)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Clock size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }} className="text-gradient">Banco de Horas</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              {isAdmin ? 'Acompanhamento de horas e férias dos colaboradores' : 'Lançamento das suas horas e férias'}
            </p>
          </div>
        </div>

        {isAdmin && usuariosLista.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserIcon size={14} color="var(--text-muted)" />
            <select
              className="input-field"
              value={targetUserId}
              onChange={e => router.push(`/dashboard/banco-horas?usuario=${e.target.value}`)}
              style={{ minWidth: '220px' }}
            >
              {usuariosLista.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isAdmin && usuariosLista.length === 0 && (
        <div className="glass" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Nenhum colaborador com Banco de Horas liberado ainda. Vá em <strong>Usuários</strong> e ative o BH para os colaboradores.
        </div>
      )}

      {!isAdmin && (
        <div className="glass" style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Você está visualizando o seu próprio banco de horas: <strong style={{ color: 'var(--text-primary)' }}>{targetUserNome}</strong>
        </div>
      )}

      {/* TABELA LANÇAMENTOS */}
      <div className="glass" style={{ padding: '24px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} color="var(--accent-blue)" />
            <h2 style={{ fontSize: '17px', fontWeight: '700', margin: 0 }}>Lançamentos de Horas</h2>
            <span className="badge badge-blue">{lancamentos.length}</span>
          </div>
          <button onClick={addLanc} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}>
            <Plus size={14} /> Nova Linha
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="bh-table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>DATA</th>
                <th style={{ width: '140px' }}>HORAS</th>
                <th style={{ width: '160px' }}>EM HAVER (SALDO)</th>
                <th>OBSERVAÇÃO</th>
                <th style={{ width: '120px', textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Nenhum lançamento ainda. Clique em <strong>Nova Linha</strong> para começar.
                </td></tr>
              )}
              {lancamentos.map(item => {
                const localKey = (item._draft ? item._localId : item.id) as string
                return (
                  <tr key={localKey}>
                    <td>
                      <input className="bh-inp" placeholder="13/04/26" value={item.data || ''}
                        onChange={e => updateLanc(localKey, 'data', e.target.value)} />
                    </td>
                    <td>
                      <input className="bh-inp" placeholder="02:15h" value={item.horas || ''}
                        onChange={e => updateLanc(localKey, 'horas', e.target.value)} />
                    </td>
                    <td>
                      <input className="bh-inp" placeholder="10:30h" value={item.em_haver || ''}
                        onChange={e => updateLanc(localKey, 'em_haver', e.target.value)} />
                    </td>
                    <td>
                      <input className="bh-inp" placeholder="Detalhes opcionais" value={item.observacao || ''}
                        onChange={e => updateLanc(localKey, 'observacao', e.target.value)} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => saveLanc(item)} className="bh-btn save" disabled={savingId === localKey}>
                        {savingId === localKey ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
                      </button>
                      <button onClick={() => deleteLanc(item)} className="bh-btn delete">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABELA FÉRIAS */}
      <div className="glass" style={{ padding: '24px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Plane size={18} color="var(--accent-green)" />
            <h2 style={{ fontSize: '17px', fontWeight: '700', margin: 0 }}>Férias</h2>
            <span className="badge badge-gray">{ferias.length}</span>
          </div>
          <button onClick={addFer} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}>
            <Plus size={14} /> Nova Linha
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="bh-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>DIAS</th>
                <th style={{ width: '160px' }}>PERÍODO</th>
                <th>DESCRIÇÃO</th>
                <th style={{ width: '140px' }}>STATUS</th>
                <th style={{ width: '120px', textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {ferias.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Nenhum registro de férias ainda. Clique em <strong>Nova Linha</strong> para adicionar.
                </td></tr>
              )}
              {ferias.map(item => {
                const localKey = (item._draft ? item._localId : item.id) as string
                return (
                  <tr key={localKey}>
                    <td>
                      <input className="bh-inp" placeholder="10 dias" value={item.dias || ''}
                        onChange={e => updateFer(localKey, 'dias', e.target.value)} />
                    </td>
                    <td>
                      <input className="bh-inp" placeholder="fev/2025" value={item.periodo || ''}
                        onChange={e => updateFer(localKey, 'periodo', e.target.value)} />
                    </td>
                    <td>
                      <input className="bh-inp" placeholder="Recesso de final do ano 2024" value={item.descricao || ''}
                        onChange={e => updateFer(localKey, 'descricao', e.target.value)} />
                    </td>
                    <td>
                      <input className="bh-inp" placeholder="OK / pendente / vencidas" value={item.status || ''}
                        onChange={e => updateFer(localKey, 'status', e.target.value)} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => saveFer(item)} className="bh-btn save" disabled={savingId === localKey}>
                        {savingId === localKey ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
                      </button>
                      <button onClick={() => deleteFer(item)} className="bh-btn delete">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .bh-table { width: 100%; border-collapse: collapse; min-width: 700px; }
        .bh-table th {
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          background: rgba(255,255,255,0.02);
        }
        .bh-table td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .bh-inp {
          width: 100%;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-primary);
          padding: 8px 10px;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          outline: none;
          transition: all 0.15s;
        }
        .bh-inp:hover { background: rgba(255,255,255,0.03); }
        .bh-inp:focus { background: rgba(79,124,255,0.08); border-color: rgba(79,124,255,0.3); }
        .bh-btn {
          width: 30px; height: 30px; border-radius: 7px;
          margin-left: 4px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.04);
          color: var(--text-secondary);
          cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .bh-btn.save:hover { background: rgba(79,124,255,0.12); border-color: rgba(79,124,255,0.4); color: var(--accent-blue); }
        .bh-btn.delete:hover { background: rgba(255,77,106,0.12); border-color: rgba(255,77,106,0.4); color: var(--accent-red); }
        .bh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
