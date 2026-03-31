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

export default function ChecklistClient({ itens: initialItens, turmas, respostas: initialRespostas, perfil, usuarioId }: Props) {
  const [itens, setItens] = useState(initialItens)
  const [respostas, setRespostas] = useState(initialRespostas)
  
  // Agora usamos um ID fixo para o sistema padrão, ignorando a necessidade de turmas externas
  const [selectedTurmaId] = useState<string>(GLOBAL_TURMA_ID)
  
  const [customTitle, setCustomTitle] = useState('Checklist de Imersão - Padrão')
  const [saving, setSaving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  // Map de respostas global
  const turmaRespostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.forEach(r => {
      map[r.item_id] = r
    })
    return map
  }, [respostas])

  // --- ATUALIZAÇÃO LOCAL (PARA DIGITAÇÃO INSTANTÂNEA) ---
  const handleLocalChange = (itemId: string, field: 'valor_texto' | 'valor_data', value: string) => {
    const existing = turmaRespostasMap[itemId]
    if (existing) {
      setRespostas(prev => prev.map(r => r.id === existing.id ? { ...r, [field]: value } : r))
    } else {
      const tempId = `temp-${itemId}`
      const newResp: any = {
        id: tempId,
        item_id: itemId,
        turma_id: GLOBAL_TURMA_ID,
        valor_texto: field === 'valor_texto' ? value : null,
        valor_data: field === 'valor_data' ? value : null,
        status: 'PENDENTE',
        respondido_por: usuarioId,
        updated_at: new Date().toISOString()
      }
      setRespostas(prev => [...prev, newResp])
    }
  }

  // --- SALVAMENTO NO BANCO (UPSERT) ---
  const performSave = async (itemId: string, updates: Partial<ChecklistResposta>) => {
    setSaving(`cell-${itemId}`)

    // Payload de gravação
    const payload = {
        item_id: itemId,
        turma_id: GLOBAL_TURMA_ID,
        ...updates,
        respondido_por: usuarioId,
        updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
        .from('checklist_respostas')
        .upsert(payload, { onConflict: 'item_id,turma_id' })
        .select()
        .single()

    if (error) {
        console.error("ERRO AO SALVAR:", error)
        alert(`Erro ao salvar: ${error.message}`)
    } else if (data) {
        setRespostas(prev => prev.map(r => (r.item_id === itemId) ? data : r))
    }

    setTimeout(() => setSaving(null), 300)
  }

  const handleDeleteItem = async (id: string) => {
    if (!isAdmin || !confirm('Excluir esta linha permanentemente?')) return
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
    <div className="checklist-standalone-container">
      {/* HEADER LIMPO E PADRÃO */}
      <div className="header-std glass">
        <div className="header-std-left">
           <div className="brand-logo"><DatabaseZap size={24} /></div>
           <div className="title-block">
             <input className="main-title-input" value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
             <span className="subtitle">Módulo de Acompanhamento Imersão - Lito Academy</span>
           </div>
        </div>
        <div className="header-std-right">
           <button className="btn-std primary" onClick={() => {
              const headers = ['ITEM', 'PRAZO', 'RESPONSÁVEL', 'ETAPA', 'DESCRIÇÃO', 'DATA', 'STATUS']
              const csv = [headers, ...itens.map(i => [i.item_n, i.contexto, i.responsavel, i.titulo, i.descricao, turmaRespostasMap[i.id]?.valor_data || '-', turmaRespostasMap[i.id]?.valor_texto || ''])]
              const content = csv.map(r => r.join(';')).join('\n')
              const link = document.createElement('a'); link.href = encodeURI("data:text/csv;charset=utf-8,\uFEFF" + content); link.download = `${customTitle}.csv`; link.click()
           }}><Download size={18}/> Exportar</button>
        </div>
      </div>

      {/* QUADRO DE PROCESSOS */}
      <div className="proc-viewport glass">
        <table className="proc-table">
          <thead>
            <tr>
              <th className="th-proc center">#</th>
              <th className="th-proc">PRAZO</th>
              <th className="th-proc">RESPONSÁVEL</th>
              <th className="th-proc">ETAPA / ITEM</th>
              <th className="th-proc">DESCRIÇÃO DO PROCESSO</th>
              <th className="th-proc">DATA REALIZAÇÃO</th>
              <th className="th-proc">SITUAÇÃO / STATUS (ESCREVA AQUI)</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const resp = turmaRespostasMap[item.id]
              const isSaving = saving === `cell-${item.id}`
              
              return (
                <tr key={item.id} className="row-proc">
                  <td className="cell-proc center">
                    <div className="n-col">
                      <span className="n-pill">{item.item_n}</span>
                      {isAdmin && <button className="trash-btn" onClick={() => handleDeleteItem(item.id)}><Trash size={12}/></button>}
                    </div>
                  </td>
                  <td className="cell-proc deadline-txt">{item.contexto}</td>
                  <td className="cell-proc resp-txt">{item.responsavel}</td>
                  <td className="cell-proc font-bold">
                    <div className="title-edit-wrap">
                       {item.titulo}
                       {isAdmin && <button className="pencil-btn" onClick={() => setEditingItem(item)}><Edit3 size={11}/></button>}
                    </div>
                  </td>
                  <td className="cell-proc desc-txt">{item.descricao}</td>
                  <td className="cell-proc">
                    <input 
                      type="date" 
                      className="inp-proc" 
                      value={resp?.valor_data || ''} 
                      onChange={e => handleLocalChange(item.id, 'valor_data', e.target.value)}
                      onBlur={e => performSave(item.id, { valor_data: (e.target as HTMLInputElement).value })} 
                    />
                  </td>
                  <td className="cell-proc">
                    <div className="status-inp-wrap">
                      <input 
                        type="text" 
                        className="inp-proc status-fill" 
                        placeholder="Escreva..."
                        value={resp?.valor_texto || ''}
                        onChange={e => handleLocalChange(item.id, 'valor_texto', e.target.value)}
                        onBlur={e => performSave(item.id, { valor_texto: (e.target as HTMLInputElement).value })}
                        onKeyDown={e => e.key === 'Enter' && performSave(item.id, { valor_texto: (e.target as HTMLInputElement).value })}
                      />
                      {isSaving && <div className="saving-box"><Loader2 size={12} className="spin" /></div>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {isAdmin && <div className="add-footer"><button className="add-btn-flat" onClick={handleAddItem}><Plus size={18}/> Nova Etapa</button></div>}
      </div>

      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
           <div className="modal-box glass" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3>✏️ Editar Etapa #{editingItem.item_n}</h3><button onClick={() => setEditingItem(null)}><X/></button></div>
              <div className="modal-body">
                 <div className="inp-group">
                    <label>Prazo</label>
                    <input className="inp-proc" value={editingItem.contexto || ''} onChange={e => setEditingItem({...editingItem, contexto: e.target.value})} />
                 </div>
                 <div className="inp-group">
                    <label>Título / Etapa</label>
                    <input className="inp-proc" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value})} />
                 </div>
                 <div className="inp-group">
                    <label>Responsável</label>
                    <input className="inp-proc" value={editingItem.responsavel || ''} onChange={e => setEditingItem({...editingItem, responsavel: e.target.value})} />
                 </div>
                 <div className="inp-group">
                    <label>Descrição Detalhada</label>
                    <textarea className="inp-proc" rows={5} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} />
                 </div>
              </div>
              <div className="modal-footer">
                 <button className="btn-std silver" onClick={() => setEditingItem(null)}>Cancelar</button>
                 <button className="btn-std primary" onClick={async () => {
                    await supabase.from('checklist_itens').update(editingItem).eq('id', editingItem.id)
                    setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i))
                    setEditingItem(null)
                 }}>Salvar Alterações</button>
              </div>
           </div>
        </div>
      )}

      <style jsx>{`
        .checklist-standalone-container { display: flex; flex-direction: column; gap: 20px; animation: fadeIn 0.5s ease; padding-bottom: 50px; color: #fff; }
        .glass { background: rgba(10, 10, 20, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; box-shadow: 0 15px 50px rgba(0,0,0,0.5); }
        
        .header-std { display: flex; justify-content: space-between; align-items: center; padding: 24px 30px; }
        .header-std-left { display: flex; align-items: center; gap: 20px; flex: 1; }
        .brand-logo { width: 52px; height: 52px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 30px rgba(79,124,255,0.4); }
        .title-block { flex: 1; display: flex; flex-direction: column; }
        .main-title-input { background: transparent; border: none; font-size: 30px; font-weight: 900; color: #fff; outline: none; border-bottom: 2px solid transparent; width: 90%; transition: 0.3s; }
        .main-title-input:focus { border-color: #4f7cff; }
        .subtitle { font-size: 11px; color: #6e6e80; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }

        .btn-std { display: flex; align-items: center; gap: 10px; padding: 12px 24px; border-radius: 14px; font-size: 15px; font-weight: 800; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: 0.2s; }
        .btn-std.primary { background: #4f7cff; color: #fff; box-shadow: 0 4px 20px rgba(79,124,255,0.3); }
        .btn-std.silver { background: rgba(255,255,255,0.05); color: #fff; }
        .btn-std:hover { transform: translateY(-3px); filter: brightness(1.2); }

        .proc-viewport { overflow: auto; max-height: 80vh; background: rgba(0,0,0,0.4); }
        .proc-table { width: 100%; border-collapse: collapse; min-width: 1400px; }
        .th-proc { position: sticky; top: 0; background: #080811; padding: 20px; font-size: 12px; color: #6e6e80; font-weight: 900; text-transform: uppercase; text-align: left; z-index: 10; border-bottom: 3px solid #252545; }
        .row-proc:hover { background: rgba(255,255,255,0.03); }
        .cell-proc { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; vertical-align: top; color: #e0e0e6; }
        
        .deadline-txt { font-weight: 800; color: #fff; width: 150px; }
        .resp-txt { color: #4f7cff; font-weight: 800; width: 150px; }
        .desc-txt { color: #8a8a9c; font-size: 12px; line-height: 1.8; max-width: 600px; white-space: pre-wrap; font-family: inherit; }
        .font-bold { font-weight: 900; color: #fff; }
        
        .n-pill { background: rgba(255,255,255,0.08); padding: 5px 12px; border-radius: 8px; font-weight: 900; font-size: 13px; color: #4f7cff; }
        .trash-btn { background: none; border: none; color: #ff4d6a; opacity: 0; cursor: pointer; transition: 0.2s; margin-top: 10px; }
        .row-proc:hover .trash-btn { opacity: 0.6; }
        
        .title-edit-wrap { display: flex; justify-content: space-between; align-items: start; gap: 10px; width: 250px; }
        .pencil-btn { background: none; border: none; color: #4f7cff; opacity: 0; cursor: pointer; transition: 0.3s; }
        .row-proc:hover .pencil-btn { opacity: 0.9; }

        .inp-proc { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; color: #fff; width: 100%; outline: none; font-size: 14px; transition: 0.2s; }
        .inp-proc:focus { border-color: #4f7cff; background: rgba(79,124,255,0.08); }
        .status-fill { font-weight: 800; color: #10d98c; border-color: rgba(16, 217, 140, 0.3); }
        
        .status-inp-wrap { position: relative; width: 200px; }
        .saving-box { position: absolute; top: -10px; right: -10px; background: #4f7cff; border-radius: 50%; padding: 5px; box-shadow: 0 0 15px rgba(79,124,255,0.5); }

        .add-footer { padding: 30px; display: flex; justify-content: center; }
        .add-btn-flat { display: flex; align-items: center; gap: 12px; padding: 16px 36px; border-radius: 18px; background: rgba(255,255,255,0.04); border: 2px dashed rgba(255,255,255,0.2); color: #9494a3; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .add-btn-flat:hover { border-color: #4f7cff; color: #fff; background: rgba(79,124,255,0.1); transform: scale(1.05); }

        /* MODAL */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-box { width: 700px; box-shadow: 0 30px 70px rgba(0,0,0,0.6); overflow: hidden; }
        .modal-header { padding: 30px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; }
        .modal-body { padding: 30px; display: flex; flex-direction: column; gap: 20px; }
        .inp-group { display: flex; flex-direction: column; gap: 8px; }
        .inp-group label { font-size: 11px; font-weight: 900; color: #6e6e80; text-transform: uppercase; letter-spacing: 1px; }
        .modal-footer { padding: 25px 30px; display: flex; justify-content: flex-end; gap: 15px; background: rgba(255,255,255,0.02); }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
