'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Edit3, CheckCircle2, Circle, 
  Calendar, Type, Save, Loader2, X, ChevronRight, 
  Settings2, GripVertical, User2, Clock, ExternalLink,
  Download, Filter, Search, Info, DatabaseZap,
  Check, AlertCircle, HelpCircle, Trash, Edit
} from 'lucide-react'

interface Props {
  itens: ChecklistItem[]
  turmas: ChecklistTurma[]
  respostas: ChecklistResposta[]
  perfil: string
  usuarioId: string
}

const GLOBAL_TURMA_ID = '00000000-0000-0000-0000-000000000000'

export default function ChecklistClient({ itens: initialItens, turmas: initialTurmas, respostas: initialRespostas, perfil, usuarioId }: Props) {
  const [itens, setItens] = useState(initialItens)
  const [respostas, setRespostas] = useState(initialRespostas)
  const [customTitle, setCustomTitle] = useState('')
  const [customSub, setCustomSub] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  useEffect(() => {
    const globalTurma = initialTurmas.find(t => t.id === GLOBAL_TURMA_ID)
    if (globalTurma) {
      setCustomTitle(globalTurma.nome || 'Checklist de Imersão - Padrão')
      // @ts-ignore - Caso tenha rodado o SQL
      setCustomSub(globalTurma.descricao || 'GESTÃO DE PROCESSOS E IMERSÕES - LITO ACADEMY')
    } else {
      setCustomTitle('Checklist de Imersão - Padrão')
      setCustomSub('GESTÃO DE PROCESSOS E IMERSÕES - LITO ACADEMY')
    }
  }, [initialTurmas])

  const turmaRespostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.forEach(r => {
      map[r.item_id] = r
    })
    return map
  }, [respostas])

  const saveHeader = async (field: 'nome' | 'descricao', value: string) => {
    setSaving('header')
    const update: any = { id: GLOBAL_TURMA_ID }
    update[field] = value
    const { error } = await supabase.from('checklist_turmas').upsert(update, { onConflict: 'id' })
    if (error) console.error("Erro ao salvar cabeçalho:", error)
    setTimeout(() => setSaving(null), 500)
  }

  const handleLocalChange = (itemId: string, field: 'valor_texto' | 'valor_data', value: string) => {
    const existing = turmaRespostasMap[itemId]
    if (existing) {
      setRespostas(prev => prev.map(r => r.id === existing.id ? { ...r, [field]: value } : r))
    } else {
      const tempId = `temp-${itemId}`
      const newResp: any = {
        id: tempId, item_id: itemId, turma_id: GLOBAL_TURMA_ID,
        valor_texto: field === 'valor_texto' ? value : null,
        valor_data: field === 'valor_data' ? value : null,
        status: 'PENDENTE', updated_at: new Date().toISOString()
      }
      setRespostas(prev => [...prev, newResp])
    }
  }

  const performSave = async (itemId: string, updates: Partial<ChecklistResposta>) => {
    setSaving(`cell-${itemId}`)
    const { data, error } = await supabase
        .from('checklist_respostas')
        .upsert({ item_id: itemId, turma_id: GLOBAL_TURMA_ID, ...updates, respondido_por: usuarioId, updated_at: new Date().toISOString() }, { onConflict: 'item_id,turma_id' })
        .select().single()
    if (!error && data) setRespostas(prev => prev.map(r => (r.item_id === itemId) ? data : r))
    setTimeout(() => setSaving(null), 300)
  }

  const handleDeleteItem = async (id: string) => {
    if (!isAdmin || !confirm('Excluir?')) return
    await supabase.from('checklist_itens').delete().eq('id', id)
    setItens(prev => prev.filter(i => i.id !== id))
  }

  const handleAddItem = async () => {
    if (!isAdmin) return
    const nextN = itens.length > 0 ? Math.max(...itens.map(i => i.item_n)) + 1 : 1
    const { data } = await supabase.from('checklist_itens').insert({
      item_n: nextN, titulo: 'Nova Etapa', contexto: 'Prazo', responsavel: 'Responsável', descricao: '', tipo_campo: 'check', ordem: nextN
    }).select().single()
    if (data) setItens(prev => [...prev, data])
  }

  return (
    <div className="checklist-v6-container">
      {/* CABEÇALHO COMPACTO */}
      <div className="header-v6 glass">
        <div className="h-left">
           <div className="h-brand"><DatabaseZap size={22} /></div>
           <div className="h-text">
             <div className="h-row">
                <input 
                  className="h-title-input" 
                  value={customTitle} 
                  onChange={e => setCustomTitle(e.target.value)} 
                  onBlur={e => saveHeader('nome', e.target.value)}
                />
                {saving === 'header' && <Loader2 size={12} className="spin blue-txt" />}
             </div>
             <input 
               className="h-sub-input" 
               value={customSub} 
               onChange={e => setCustomSub(e.target.value)}
               onBlur={e => saveHeader('descricao', e.target.value)}
               placeholder="Adicione uma descrição para este relatório..."
             />
           </div>
        </div>
        <div className="h-right">
           <button className="h-btn silver" onClick={() => {
              const csv = itens.map(i => `${i.item_n};${i.titulo};${turmaRespostasMap[i.id]?.valor_texto || ''}`).join('\n')
              const link = document.createElement('a'); link.href = encodeURI("data:text/csv;charset=utf-8,\uFEFF" + csv); link.download = 'checklist.csv'; link.click()
           }}><Download size={16}/> Exportar</button>
        </div>
      </div>

      {/* QUADRO PLANILHA */}
      <div className="q-viewport glass">
        <table className="q-table">
          <thead>
            <tr>
              <th className="th-q center">#</th>
              <th className="th-q">PRAZO</th>
              <th className="th-q">RESPONSÁVEL</th>
              <th className="th-q">ETAPA DO PROCESSO</th>
              <th className="th-q">DESCRIÇÃO DETALHADA</th>
              <th className="th-q">DATA</th>
              <th className="th-q">SITUAÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const resp = turmaRespostasMap[item.id]
              const isSaving = saving === `cell-${item.id}`
              return (
                <tr key={item.id} className="tr-q">
                  <td className="td-q center">
                    <div className="n-col">
                      <span className="n-pill">{item.item_n}</span>
                      {isAdmin && <button className="trash" onClick={() => handleDeleteItem(item.id)}><Trash size={12}/></button>}
                    </div>
                  </td>
                  <td className="td-q font-bold color-w">{item.contexto}</td>
                  <td className="td-q blue-txt">{item.responsavel}</td>
                  <td className="td-q font-bold">
                    <div className="edit-wrap">
                       {item.titulo}
                       {isAdmin && <button className="pencil" onClick={() => setEditingItem(item)}><Edit3 size={11}/></button>}
                    </div>
                  </td>
                  <td className="td-q desc-txt">{item.descricao}</td>
                  <td className="td-q">
                    <input type="date" className="inp-q" value={resp?.valor_data || ''} onChange={e => handleLocalChange(item.id, 'valor_data', e.target.value)} onBlur={e => performSave(item.id, { valor_data: e.target.value })} />
                  </td>
                  <td className="td-q">
                    <div className="status-wrap">
                      <input 
                        type="text" className="inp-q status-f" placeholder="..."
                        value={resp?.valor_texto || ''}
                        onChange={e => handleLocalChange(item.id, 'valor_texto', e.target.value)}
                        onBlur={e => performSave(item.id, { valor_texto: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && performSave(item.id, { valor_texto: (e.target as HTMLInputElement).value })}
                      />
                      {isSaving && <div className="save-icon"><Loader2 size={10} className="spin" /></div>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {isAdmin && <div className="footer-v6"><button className="add-btn-v6" onClick={handleAddItem}><Plus size={16}/> Adicionar Etapa</button></div>}
      </div>

      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
           <div className="modal-box glass" onClick={e => e.stopPropagation()}>
              <div className="modal-h"><h3>✏️ Ajustar Processo #{editingItem.item_n}</h3><button onClick={() => setEditingItem(null)}><X/></button></div>
              <div className="modal-b">
                 <div className="inp-g">
                    <label>Número/Ordem</label>
                    <input type="number" className="inp-q" value={editingItem.item_n} onChange={e => setEditingItem({...editingItem, item_n: parseInt(e.target.value)})} />
                 </div>
                 <div className="inp-g">
                    <label>Prazo / Meta</label>
                    <input className="inp-q" value={editingItem.contexto || ''} onChange={e => setEditingItem({...editingItem, contexto: e.target.value})} />
                 </div>
                 <div className="inp-g">
                    <label>Título da Etapa</label>
                    <input className="inp-q" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value})} />
                 </div>
                 <div className="inp-g">
                    <label>Responsável Padrão</label>
                    <input className="inp-q" value={editingItem.responsavel || ''} onChange={e => setEditingItem({...editingItem, responsavel: e.target.value})} />
                 </div>
                 <div className="inp-g">
                    <label>Descrição Detalhada do Processo</label>
                    <textarea className="inp-q" rows={6} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} />
                 </div>
              </div>
              <div className="modal-f"><button className="h-btn silver" onClick={() => setEditingItem(null)}>Cancelar</button><button className="h-btn primary" onClick={async () => {
                await supabase.from('checklist_itens').update(editingItem).eq('id', editingItem.id)
                setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i)); setEditingItem(null)
              }}>Salvar Mudanças</button></div>
           </div>
        </div>
      )}

      <style jsx>{`
        .checklist-v6-container { display: flex; flex-direction: column; gap: 15px; animation: fadeIn 0.4s ease; padding-bottom: 50px; color: #fff; }
        .glass { background: rgba(10, 10, 18, 0.98); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
        
        .header-v6 { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-radius: 14px; }
        .h-left { display: flex; align-items: center; gap: 16px; flex: 1; }
        .h-brand { width: 44px; height: 44px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 15px rgba(79,124,255,0.3); }
        .h-text { flex: 1; }
        .h-row { display: flex; align-items: center; gap: 10px; }
        .h-title-input { background: transparent; border: none; font-size: 20px; font-weight: 800; color: #fff; outline: none; border-bottom: 2px solid transparent; width: 400px; -webkit-appearance: none; }
        .h-title-input:focus { border-color: #4f7cff; }
        .h-sub-input { background: transparent; border: none; font-size: 11px; color: #6e6e80; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; outline: none; width: 100%; margin-top: 2px; }
        .h-sub-input:focus { color: #fff; }

        .h-btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: 0.2s; }
        .h-btn.primary { background: #4f7cff; color: #fff; }
        .h-btn.silver { background: rgba(255,255,255,0.05); color: #fff; }

        .q-viewport { overflow: auto; max-height: 80vh; background: rgba(0,0,0,0.2); }
        .q-table { width: 100%; border-collapse: collapse; min-width: 1400px; }
        .th-q { position: sticky; top: 0; background: #080811; padding: 16px; font-size: 10px; color: #6e6e80; font-weight: 800; text-transform: uppercase; text-align: left; z-index: 10; border-bottom: 2px solid #252545; }
        .td-q { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; vertical-align: top; }
        
        .blue-txt { color: #4f7cff; font-weight: 700; }
        .desc-txt { color: #8a8a9c; font-size: 12px; line-height: 1.6; max-width: 550px; white-space: pre-wrap; }
        .font-bold { font-weight: 700; }
        .color-w { color: #fff; }
        
        .inp-q { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 8px; color: #fff; width: 100%; outline: none; font-size: 13px; }
        .status-f { font-weight: 700; color: #10d98c; border-color: rgba(16, 217, 140, 0.2); }
        .save-icon { position: absolute; top: -8px; right: -8px; background: #4f7cff; border-radius: 50%; padding: 3px; }
        .status-wrap { position: relative; width: 180px; }

        .footer-v6 { padding: 20px; display: flex; justify-content: center; }
        .add-btn-v6 { padding: 12px 24px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1.5px dashed rgba(255,255,255,0.15); color: #9494a3; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .add-btn-v6:hover { border-color: #4f7cff; color: #fff; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-box { width: 650px; overflow: hidden; animation: zoomIn 0.3s ease; }
        .modal-h { padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; }
        .modal-b { padding: 24px; display: flex; flex-direction: column; gap: 15px; }
        .inp-g { display: flex; flex-direction: column; gap: 6px; }
        .inp-g label { font-size: 10px; font-weight: 800; color: #6e6e80; text-transform: uppercase; }
        .modal-f { padding: 20px 24px; display: flex; justify-content: flex-end; gap: 12px; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
