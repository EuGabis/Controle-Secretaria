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

export default function ChecklistClient({ itens: initialItens, turmas: initialTurmas, respostas: initialRespostas, perfil, usuarioId }: Props) {
  const [itens, setItens] = useState(initialItens)
  const [respostas, setRespostas] = useState(initialRespostas)
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(initialTurmas[0]?.id || '')
  const [customTitle, setCustomTitle] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  useEffect(() => {
    const turma = initialTurmas.find(t => t.id === selectedTurmaId)
    if (turma && !customTitle) setCustomTitle(`Acompanhamento Imersão - ${turma.nome}`)
  }, [selectedTurmaId, initialTurmas, customTitle])

  const turmaRespostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.filter(r => r.turma_id === selectedTurmaId).forEach(r => {
      map[r.item_id] = r
    })
    return map
  }, [respostas, selectedTurmaId])

  // --- SALVAMENTO UNIVERSAL (PARA TEXTO E DATA) ---
  const saveValue = async (itemId: string, updates: Partial<ChecklistResposta>) => {
    if (!selectedTurmaId) return
    setSaving(`cell-${itemId}`)

    // 1. Otimista
    const existing = turmaRespostasMap[itemId]
    if (existing) {
       setRespostas(prev => prev.map(r => r.id === existing.id ? { ...r, ...updates } : r))
    }

    // 2. Upsert
    const { data, error } = await supabase
        .from('checklist_respostas')
        .upsert({
            item_id: itemId,
            turma_id: selectedTurmaId,
            ...updates,
            respondido_por: usuarioId,
            updated_at: new Date().toISOString()
        }, { onConflict: 'item_id,turma_id' })
        .select()
        .single()

    if (error) {
        console.error("Erro no salvamento:", error)
        alert(`Erro ao salvar: ${error.message}`)
    } else if (data && !existing) {
        setRespostas(prev => [...prev, data])
    }

    setTimeout(() => setSaving(null), 400)
  }

  const handleDeleteItem = async (id: string) => {
    if (!isAdmin || !confirm('Excluir esta linha?')) return
    const { error } = await supabase.from('checklist_itens').delete().eq('id', id)
    if (!error) setItens(prev => prev.filter(i => i.id !== id))
  }

  const handleAddItem = async () => {
    if (!isAdmin) return
    const nextN = itens.length > 0 ? Math.max(...itens.map(i => i.item_n)) + 1 : 1
    const { data, error } = await supabase.from('checklist_itens').insert({
      item_n: nextN, titulo: 'Nova Etapa', contexto: 'Prazo', responsavel: 'Responsável', descricao: '', tipo_campo: 'check', ordem: nextN
    }).select().single()
    if (!error && data) setItens(prev => [...prev, data])
  }

  return (
    <div className="checklist-v3-container">
      {/* CABEÇALHO */}
      <div className="header-v3 glass">
        <div className="header-v3-left">
           <div className="brand-badge"><DatabaseZap size={22} /></div>
           <div className="title-area">
             <input className="title-input" value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
             <span>Controle de Acompanhamento Profissional</span>
           </div>
        </div>
        <div className="header-v3-right">
           <div className="turma-select-v3">
              <Filter size={14}/>
              <select value={selectedTurmaId} onChange={e => setSelectedTurmaId(e.target.value)}>
                {initialTurmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
           </div>
           <button className="btn-v3 primary" onClick={() => {
              const headers = ['ITEM', 'PRAZO', 'RESPONSÁVEL', 'ETAPA', 'DESCRIÇÃO', 'DATA', 'STATUS']
              const csv = [headers, ...itens.map(i => [i.item_n, i.contexto, i.responsavel, i.titulo, i.descricao, turmaRespostasMap[i.id]?.valor_data || '-', turmaRespostasMap[i.id]?.valor_texto || ''])]
              const content = csv.map(r => r.join(';')).join('\n')
              const link = document.createElement('a'); link.href = encodeURI("data:text/csv;charset=utf-8,\uFEFF" + content); link.download = `${customTitle}.csv`; link.click()
           }}><Download size={16}/> Exportar</button>
        </div>
      </div>

      {/* TABELA PLANILHA */}
      <div className="table-container-v3 glass">
        <table className="table-v3">
          <thead>
            <tr>
              <th className="th-v3 center">#</th>
              <th className="th-v3">PRAZO</th>
              <th className="th-v3">QUEM</th>
              <th className="th-v3">ETAPA / ITEM</th>
              <th className="th-v3">DESCRIÇÃO DETALHADA</th>
              <th className="th-v3">DATA</th>
              <th className="th-v3">STATUS (ESCREVA FEITO / NÃO)</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const resp = turmaRespostasMap[item.id]
              const isSaving = saving === `cell-${item.id}`
              
              return (
                <tr key={item.id} className="tr-v3">
                  <td className="td-v3 center">
                    <div className="n-wrap">
                      <span className="n-text">{item.item_n}</span>
                      {isAdmin && <button className="del-btn" onClick={() => handleDeleteItem(item.id)}><Trash size={12}/></button>}
                    </div>
                  </td>
                  <td className="td-v3 font-bold">{item.contexto}</td>
                  <td className="td-v3 blue-text">{item.responsavel}</td>
                  <td className="td-v3 font-bold">
                    <div className="edit-wrap">
                       {item.titulo}
                       {isAdmin && <button className="edit-btn" onClick={() => setEditingItem(item)}><Edit size={10}/></button>}
                    </div>
                  </td>
                  <td className="td-v3 desc-text">{item.descricao}</td>
                  <td className="td-v3">
                    <input type="date" className="input-v3" value={resp?.valor_data || ''} onChange={e => saveValue(item.id, { valor_data: e.target.value })} />
                  </td>
                  <td className="td-v3">
                    <div className="status-wrap-v3">
                      <input 
                        type="text" 
                        className="input-v3 status-text-input" 
                        placeholder="Escreva o status..."
                        value={resp?.valor_texto || ''}
                        onBlur={e => saveValue(item.id, { valor_texto: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && saveValue(item.id, { valor_texto: (e.target as HTMLInputElement).value })}
                      />
                      {isSaving && <Loader2 size={12} className="spin saving-icon" />}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {isAdmin && <div className="footer-v3"><button className="add-btn-v3" onClick={handleAddItem}><Plus size={16}/> Adicionar Etapa</button></div>}
      </div>

      {editingItem && (
        <div className="overlay-v3" onClick={() => setEditingItem(null)}>
           <div className="modal-v3 glass" onClick={e => e.stopPropagation()}>
              <div className="modal-header-v3"><h3>Editar Etapa #{editingItem.item_n}</h3><button onClick={() => setEditingItem(null)}><X/></button></div>
              <div className="modal-body-v3">
                 <input className="input-v3" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value})} placeholder="Título" />
                 <textarea className="input-v3" rows={5} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} placeholder="Descrição" />
              </div>
              <div className="modal-footer-v3">
                 <button className="btn-v3 silver" onClick={() => setEditingItem(null)}>Cancelar</button>
                 <button className="btn-v3 primary" onClick={async () => {
                    await supabase.from('checklist_itens').update(editingItem).eq('id', editingItem.id)
                    setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i))
                    setEditingItem(null)
                 }}>Salvar</button>
              </div>
           </div>
        </div>
      )}

      <style jsx>{`
        .checklist-v3-container { display: flex; flex-direction: column; gap: 20px; animation: fadeIn 0.4s ease; padding-bottom: 50px; }
        .glass { background: rgba(15, 15, 25, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; }
        
        .header-v3 { display: flex; justify-content: space-between; align-items: center; padding: 24px; }
        .header-v3-left { display: flex; align-items: center; gap: 16px; flex: 1; }
        .brand-badge { width: 48px; height: 48px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(79,124,255,0.3); }
        .title-area { flex: 1; }
        .title-input { background: transparent; border: none; font-size: 26px; font-weight: 800; color: #fff; outline: none; width: 100%; border-bottom: 2px solid transparent; transition: 0.3s; }
        .title-input:focus { border-color: #4f7cff; }
        .title-area span { font-size: 11px; color: #6e6e80; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }

        .header-v3-right { display: flex; gap: 12px; align-items: center; }
        .turma-select-v3 { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0 12px; height: 44px; display: flex; align-items: center; gap: 8px; }
        .turma-select-v3 select { background: transparent; border: none; color: #fff; font-weight: 700; outline: none; }
        
        .btn-v3 { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: 0.2s; }
        .btn-v3.primary { background: #4f7cff; color: #fff; }
        .btn-v3.silver { background: rgba(255,255,255,0.05); color: #fff; }
        .btn-v3:hover { transform: translateY(-2px); filter: brightness(1.15); }

        .table-container-v3 { overflow: auto; max-height: 80vh; border: 1px solid rgba(255,255,255,0.05); background: rgba(10,10,18,0.7); }
        .table-v3 { width: 100%; border-collapse: collapse; min-width: 1200px; }
        .th-v3 { position: sticky; top: 0; background: #12121e; padding: 16px; font-size: 11px; color: #6e6e80; font-weight: 800; text-transform: uppercase; text-align: left; z-index: 10; border-bottom: 2px solid #252535; }
        .tr-v3:hover { background: rgba(255,255,255,0.02); }
        .td-v3 { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; vertical-align: top; color: #e0e0e6; }
        
        .center { text-align: center; }
        .font-bold { font-weight: 700; color: #fff; }
        .blue-text { color: #4f7cff; font-weight: 700; }
        .desc-text { color: #9494a3; font-size: 12px; line-height: 1.6; max-width: 450px; white-space: pre-wrap; }
        
        .n-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .n-text { background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; }
        .del-btn { background: none; border: none; color: #ff4d6a; opacity: 0; cursor: pointer; transition: 0.2s; }
        .tr-v3:hover .del-btn { opacity: 0.5; }
        
        .edit-wrap { display: flex; justify-content: space-between; gap: 8px; }
        .edit-btn { background: none; border: none; color: #4f7cff; opacity: 0; cursor: pointer; transition: 0.2s; }
        .tr-v3:hover .edit-btn { opacity: 0.7; }

        .input-v3 { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px; color: #fff; width: 100%; outline: none; font-size: 13px; }
        .input-v3:focus { border-color: #4f7cff; background: rgba(79,124,255,0.05); }
        .status-text-input { font-weight: 700; color: #4f7cff; }
        .status-wrap-v3 { position: relative; }
        .saving-icon { position: absolute; top: -6px; right: -6px; color: #4f7cff; }

        .footer-v3 { padding: 24px; display: flex; justify-content: center; }
        .add-btn-v3 { display: flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1.5px dashed rgba(255,255,255,0.15); color: #9494a3; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .add-btn-v3:hover { border-color: #4f7cff; color: #fff; background: rgba(79,124,255,0.05); }

        .overlay-v3 { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-v3 { width: 600px; }
        .modal-header-v3 { padding: 24px; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .modal-body-v3 { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .modal-footer-v3 { padding: 20px 24px; display: flex; justify-content: flex-end; gap: 12px; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
