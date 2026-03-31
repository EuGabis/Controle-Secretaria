'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Edit3, CheckCircle2, Circle, 
  Calendar, Type, Save, Loader2, X, ChevronRight, 
  Settings2, GripVertical, User2, Clock 
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  const [saving, setSaving] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<{ id: string, field: string, value: string } | null>(null)
  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  const respostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.forEach(r => {
      map[`${r.item_id}-${r.turma_id}`] = r
    })
    return map
  }, [respostas])

  const saveCell = useCallback(async (itemId: string, turmaId: string, updates: Partial<ChecklistResposta>) => {
    const key = `${itemId}-${turmaId}`
    setSaving(key)
    const existing = respostasMap[key]

    if (existing) {
      const { data, error } = await supabase
        .from('checklist_respostas')
        .update({ ...updates, respondido_por: usuarioId, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select().single()
      if (!error && data) setRespostas(prev => prev.map(r => r.id === existing.id ? { ...r, ...data } : r))
    } else {
      const { data, error } = await supabase
        .from('checklist_respostas')
        .insert({ item_id: itemId, turma_id: turmaId, ...updates, respondido_por: usuarioId })
        .select().single()
      if (!error && data) setRespostas(prev => [...prev, data])
    }
    setTimeout(() => setSaving(null), 800)
  }, [respostasMap, supabase, usuarioId])

  const updateItemField = async (id: string, field: string, value: string) => {
    setSaving(`item-${id}-${field}`)
    const { error } = await supabase.from('checklist_itens').update({ [field]: value }).eq('id', id)
    if (!error) {
      setItens(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    }
    setEditingField(null)
    setTimeout(() => setSaving(null), 500)
  }

  const handleAddItem = async () => {
    if (!isAdmin) return
    const titulo = prompt('Título do Processo:')
    if (!titulo) return
    const responsavel = prompt('Responsável (ex: GABRIEL):')
    const contexto = prompt('Contexto/Prazo (ex: Antens de vender):')
    const tipo = prompt('Tipo de campo (check, texto, data):', 'check') as any

    const { data, error } = await supabase
      .from('checklist_itens')
      .insert({ titulo, responsavel, contexto, tipo_campo: tipo, ordem: itens.length })
      .select().single()
    if (!error && data) setItens(prev => [...prev, data])
  }

  const handleAddTurma = async () => {
    if (!isAdmin) return
    const nome = prompt('Nome da nova Turma:')
    if (!nome) return
    const { data, error } = await supabase.from('checklist_turmas').insert({ nome }).select().single()
    if (!error && data) setTurmas(prev => [...prev, data])
  }

  return (
    <div className="checklist-container">
      <div className="checklist-header">
        <div className="header-info">
          <div className="icon-wrapper"><Settings2 size={24} color="#fff" /></div>
          <div>
            <h1 className="text-gradient">Acompanhamento Operacional</h1>
            <p>Sincronizado em tempo real • Planilha de Controle</p>
          </div>
        </div>
        {isAdmin && (
          <div className="admin-actions">
            <button className="glass-btn secondary" onClick={handleAddItem}><Plus size={16} /> Novo Processo</button>
            <button className="glass-btn primary" onClick={handleAddTurma}><Plus size={16} /> Nova Turma</button>
          </div>
        )}
      </div>

      <div className="checklist-grid-wrapper glass">
        <table className="checklist-table">
          <thead>
            <tr>
              <th className="sticky-col header-cell main-header">PROCESSO</th>
              <th className="sticky-col header-cell sub-header offset-1">RESPONSÁVEL</th>
              <th className="sticky-col header-cell sub-header offset-2">CONTEXTO / PRAZO</th>
              {turmas.map(turma => (
                <th key={turma.id} className="header-cell column-header">
                  <div className="column-label">
                    <span>{turma.nome}</span>
                    {isAdmin && (
                      <button className="icon-btn delete" onClick={() => {
                        if (confirm('Deletar turma?')) supabase.from('checklist_turmas').delete().eq('id', turma.id).then(() => setTurmas(t => t.filter(x => x.id !== turma.id)))
                      }}><X size={12} /></button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itens.map((item, idx) => (
              <tr key={item.id} className="row-hover">
                {/* COLUNAS FIXAS ESQUERDA */}
                <td className="sticky-col body-cell process-info">
                  <div className="process-content">
                    <span className="process-index">{idx + 1}</span>
                    {editingField?.id === item.id && editingField?.field === 'titulo' ? (
                      <input 
                        autoFocus className="inline-edit" 
                        defaultValue={item.titulo} 
                        onBlur={(e) => updateItemField(item.id, 'titulo', e.target.value)}
                      />
                    ) : (
                      <span className="process-title" onDoubleClick={() => isAdmin && setEditingField({ id: item.id, field: 'titulo', value: item.titulo })}>
                        {item.titulo}
                      </span>
                    )}
                  </div>
                </td>

                <td className="sticky-col body-cell meta-info offset-1">
                  <div className="meta-content">
                    <User2 size={12} className="meta-icon" />
                    {editingField?.id === item.id && editingField?.field === 'responsavel' ? (
                      <input 
                        autoFocus className="inline-edit" 
                        defaultValue={item.responsavel || ''} 
                        onBlur={(e) => updateItemField(item.id, 'responsavel', e.target.value)}
                      />
                    ) : (
                      <span className="meta-text" onDoubleClick={() => isAdmin && setEditingField({ id: item.id, field: 'responsavel', value: item.responsavel || '' })}>
                        {item.responsavel || '---'}
                      </span>
                    )}
                  </div>
                </td>

                <td className="sticky-col body-cell meta-info offset-2">
                  <div className="meta-content">
                    <Clock size={12} className="meta-icon" />
                    {editingField?.id === item.id && editingField?.field === 'contexto' ? (
                      <input 
                        autoFocus className="inline-edit" 
                        defaultValue={item.contexto || ''} 
                        onBlur={(e) => updateItemField(item.id, 'contexto', e.target.value)}
                      />
                    ) : (
                      <span className="meta-text" onDoubleClick={() => isAdmin && setEditingField({ id: item.id, field: 'contexto', value: item.contexto || '' })}>
                        {item.contexto || '---'}
                      </span>
                    )}
                  </div>
                </td>
                
                {/* COLUNAS DINÂMICAS TURMAS */}
                {turmas.map(turma => {
                  const resp = respostasMap[`${item.id}-${turma.id}`]
                  const isSaving = saving === `${item.id}-${turma.id}`
                  return (
                    <td key={turma.id} className="body-cell input-cell">
                      <div className={`cell-wrapper ${isSaving ? 'cell-saving' : ''}`}>
                        {item.tipo_campo === 'check' && (
                          <button className={`check-input ${resp?.status_check ? 'checked' : ''}`} onClick={() => saveCell(item.id, turma.id, { status_check: !resp?.status_check })}>
                            {resp?.status_check ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                          </button>
                        )}
                        {item.tipo_campo === 'texto' && (
                          <textarea className="text-input" defaultValue={resp?.valor_texto || ''} onBlur={(e) => e.target.value !== (resp?.valor_texto || '') && saveCell(item.id, turma.id, { valor_texto: e.target.value })} />
                        )}
                        {item.tipo_campo === 'data' && (
                          <input type="date" className="date-input" defaultValue={resp?.valor_data || ''} onChange={(e) => saveCell(item.id, turma.id, { valor_data: e.target.value })} />
                        )}
                        {isSaving && <div className="saving-indicator"><Loader2 size={12} className="spin" /></div>}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .checklist-container { display: flex; flex-direction: column; gap: 24px; animation: fadeIn 0.4s ease; }
        .checklist-header { display: flex; justify-content: space-between; align-items: center; }
        .header-info { display: flex; align-items: center; gap: 16px; }
        .icon-wrapper { width: 44px; height: 44px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(79,124,255,0.3); }
        .checklist-header h1 { font-size: 24px; font-weight: 800; margin: 0; color: #fff; }
        .checklist-header p { color: var(--text-muted); font-size: 13px; margin: 0; }
        .admin-actions { display: flex; gap: 10px; }
        
        .glass-btn { padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.1); transition: 0.2s; }
        .glass-btn.primary { background: #4f7cff; color: #fff; }
        .glass-btn.secondary { background: rgba(255,255,255,0.05); color: #fff; }

        .checklist-grid-wrapper { border-radius: 16px; overflow: auto; border: 1px solid var(--border); background: rgba(10,10,20,0.4); max-height: 75vh; }
        .checklist-table { width: 100%; border-collapse: separate; border-spacing: 0; }

        .header-cell { background: #12121a; padding: 14px; font-size: 11px; font-weight: 800; color: #6e6e80; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 20; text-transform: uppercase; letter-spacing: 0.05em; }
        .sticky-col { position: sticky; left: 0; z-index: 30; }
        .main-header { left: 0; width: 300px; min-width: 300px; z-index: 40; background: #12121a; border-right: 1px solid var(--border); }
        .sub-header.offset-1 { left: 300px; width: 150px; min-width: 150px; z-index: 35; border-right: 1px solid var(--border); }
        .sub-header.offset-2 { left: 450px; width: 200px; min-width: 200px; z-index: 35; border-right: 1px solid var(--border); }
        
        .column-header { min-width: 160px; text-align: center; border-left: 1px solid var(--border); }
        .column-label { display: flex; align-items: center; justify-content: center; gap: 6px; }

        .body-cell { padding: 8px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .process-info { left: 0; background: #0f0f16; border-right: 1px solid var(--border); }
        .meta-info.offset-1 { left: 300px; background: #0f0f16; border-right: 1px solid var(--border); }
        .meta-info.offset-2 { left: 450px; background: #0f0f16; border-right: 1px solid var(--border); }

        .process-content { display: flex; align-items: center; gap: 10px; }
        .process-index { font-size: 10px; color: #4f7cff; font-weight: 800; opacity: 0.6; }
        .process-title { font-size: 13px; font-weight: 600; color: #e0e0e6; line-height: 1.4; }
        
        .meta-content { display: flex; align-items: center; gap: 6px; color: #9494a3; font-size: 12px; }
        .meta-icon { opacity: 0.4; flex-shrink: 0; }
        .meta-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .input-cell { border-left: 1px solid var(--border); padding: 4px; }
        .cell-wrapper { min-height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; relative; transition: 0.2s; }
        .cell-saving { background: rgba(79,124,255,0.08); }

        .check-input { background: none; border: none; cursor: pointer; color: #303040; transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .check-input.checked { color: #10d98c; filter: drop-shadow(0 0 5px rgba(16,217,140,0.3)); }
        .check-input:hover { transform: scale(1.1); }

        .text-input { width: 100%; height: 36px; background: transparent; border: none; padding: 6px; color: #c0c0cf; font-size: 12px; text-align: center; resize: none; overflow: hidden; }
        .text-input:focus { outline: none; background: rgba(255,255,255,0.03); text-align: left; }
        
        .date-input { background: transparent; border: none; color: #c0c0cf; font-size: 12px; width: 100%; text-align: center; cursor: pointer; }

        .inline-edit { background: rgba(255,255,255,0.05); border: 1px solid #4f7cff; border-radius: 4px; color: #fff; padding: 2px 6px; font-size: 12px; width: 100%; outline: none; }

        .saving-indicator { position: absolute; top: 4px; right: 4px; color: #4f7cff; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .checklist-grid-wrapper::-webkit-scrollbar { width: 6px; height: 6px; }
        .checklist-grid-wrapper::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  )
}
