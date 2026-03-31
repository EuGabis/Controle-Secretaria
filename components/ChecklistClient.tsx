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
  const [saving, setSaving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  // Sincroniza o título oficial do banco (se existir)
  useEffect(() => {
    const globalTurma = initialTurmas.find(t => t.id === GLOBAL_TURMA_ID)
    if (globalTurma) {
      setCustomTitle(globalTurma.nome || 'Checklist de Imersão - Padrão')
    } else {
      setCustomTitle('Checklist de Imersão - Padrão')
    }
  }, [initialTurmas])

  const turmaRespostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.forEach(r => {
      map[r.item_id] = r
    })
    return map
  }, [respostas])

  // --- SALVAMENTO DO TÍTULO NO TOPO ---
  const saveTitle = async (newTitle: string) => {
    setSaving('title')
    const { error } = await supabase
      .from('checklist_turmas')
      .upsert({ id: GLOBAL_TURMA_ID, nome: newTitle.toUpperCase() }, { onConflict: 'id' })
    
    if (error) {
      console.error("Erro ao salvar título:", error)
      alert("Erro ao salvar nome da imersão.")
    }
    setTimeout(() => setSaving(null), 500)
  }

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
        updated_at: new Date().toISOString()
      }
      setRespostas(prev => [...prev, newResp])
    }
  }

  const performSave = async (itemId: string, updates: Partial<ChecklistResposta>) => {
    setSaving(`cell-${itemId}`)
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
        .select().single()

    if (error) {
        alert(`Erro ao salvar status: ${error.message}`)
    } else if (data) {
        setRespostas(prev => prev.map(r => (r.item_id === itemId) ? data : r))
    }
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
    <div className="checklist-full-container">
      {/* CABEÇALHO */}
      <div className="header-full glass">
        <div className="header-left">
           <div className="logo-badge"><DatabaseZap size={24} /></div>
           <div className="title-section">
             <div className="title-row">
                <input 
                  className="main-title-edit" 
                  value={customTitle} 
                  onChange={e => setCustomTitle(e.target.value)} 
                  onBlur={e => saveTitle(e.target.value)}
                />
                {saving === 'title' && <Loader2 size={14} className="spin blue-txt" />}
             </div>
             <span className="subtitle">Gestão de Processos e Imersões - Lito Academy</span>
           </div>
        </div>
        <div className="header-right">
           <button className="btn-full primary" onClick={() => {
              const csv = itens.map(i => `${i.item_n};${i.titulo};${turmaRespostasMap[i.id]?.valor_texto || ''}`).join('\n')
              const link = document.createElement('a'); link.href = encodeURI("data:text/csv;charset=utf-8,\uFEFF" + csv); link.download = 'checklist.csv'; link.click()
           }}><Download size={18}/> Exportar Relatório</button>
        </div>
      </div>

      {/* QUADRO */}
      <div className="quadro-viewport glass">
        <table className="quadro-table">
          <thead>
            <tr>
              <th className="th-quadro center">#</th>
              <th className="th-quadro">PRAZO</th>
              <th className="th-quadro">RESPONSÁVEL</th>
              <th className="th-quadro">ETAPA DO PROCESSO</th>
              <th className="th-quadro">DETALHAMENTO</th>
              <th className="th-quadro">DATA</th>
              <th className="th-quadro">STATUS ATUAL (ESCREVA AQUI)</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const resp = turmaRespostasMap[item.id]
              const isSaving = saving === `cell-${item.id}`
              return (
                <tr key={item.id} className="tr-quadro">
                  <td className="td-quadro center">
                    <div className="n-col">
                      <span className="n-badge">{item.item_n}</span>
                      {isAdmin && <button className="del-btn" onClick={() => handleDeleteItem(item.id)}><Trash size={12}/></button>}
                    </div>
                  </td>
                  <td className="td-quadro font-bold">{item.contexto}</td>
                  <td className="td-quadro blue-txt">{item.responsavel}</td>
                  <td className="td-quadro font-bold">
                    <div className="edit-wrap">
                       {item.titulo}
                       {isAdmin && <button className="pencil-btn" onClick={() => setEditingItem(item)}><Edit3 size={11}/></button>}
                    </div>
                  </td>
                  <td className="td-quadro desc-txt">{item.descricao}</td>
                  <td className="td-quadro">
                    <input type="date" className="inp-quadro" value={resp?.valor_data || ''} onChange={e => handleLocalChange(item.id, 'valor_data', e.target.value)} onBlur={e => performSave(item.id, { valor_data: e.target.value })} />
                  </td>
                  <td className="td-quadro">
                    <div className="status-wrap">
                      <input 
                        type="text" 
                        className="inp-quadro status-fill" 
                        placeholder="Escreva..."
                        value={resp?.valor_texto || ''}
                        onChange={e => handleLocalChange(item.id, 'valor_texto', e.target.value)}
                        onBlur={e => performSave(item.id, { valor_texto: e.target.value })}
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
        {isAdmin && <div className="add-footer"><button className="add-btn" onClick={handleAddItem}><Plus size={18}/> Adicionar Novo Processo</button></div>}
      </div>

      {editingItem && (
        <div className="overlay" onClick={() => setEditingItem(null)}>
           <div className="modal glass" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3>✏️ Editar Etapa #{editingItem.item_n}</h3><button onClick={() => setEditingItem(null)}><X/></button></div>
              <div className="modal-body">
                 <div className="inp-group"><label>Etapa</label><input className="inp-quadro" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value})} /></div>
                 <div className="inp-group"><label>Descrição Detalhada</label><textarea className="inp-quadro" rows={5} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button className="btn-full silver" onClick={() => setEditingItem(null)}>Cancelar</button><button className="btn-full primary" onClick={async () => {
                await supabase.from('checklist_itens').update(editingItem).eq('id', editingItem.id)
                setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i)); setEditingItem(null)
              }}>Salvar</button></div>
           </div>
        </div>
      )}

      <style jsx>{`
        .checklist-full-container { display: flex; flex-direction: column; gap: 20px; animation: fadeIn 0.4s ease; padding-bottom: 50px; color: #fff; }
        .glass { background: rgba(15, 15, 25, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; }
        .header-full { display: flex; justify-content: space-between; align-items: center; padding: 24px 30px; }
        .header-left { display: flex; align-items: center; gap: 20px; flex: 1; }
        .logo-badge { width: 52px; height: 52px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .title-row { display: flex; align-items: center; gap: 12px; }
        .main-title-edit { background: transparent; border: none; font-size: 30px; font-weight: 900; color: #fff; outline: none; border-bottom: 2px solid transparent; width: 600px; }
        .main-title-edit:focus { border-color: #4f7cff; }
        .subtitle { font-size: 11px; color: #6e6e80; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }
        .btn-full { display: flex; align-items: center; gap: 10px; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 800; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); }
        .btn-full.primary { background: #4f7cff; color: #fff; }
        
        .quadro-viewport { overflow: auto; max-height: 80vh; background: rgba(0,0,0,0.4); }
        .quadro-table { width: 100%; border-collapse: collapse; min-width: 1400px; }
        .th-quadro { position: sticky; top: 0; background: #080811; padding: 20px; font-size: 11px; color: #6e6e80; font-weight: 900; text-transform: uppercase; text-align: left; z-index: 10; border-bottom: 3px solid #252545; }
        .td-quadro { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; vertical-align: top; }
        
        .blue-txt { color: #4f7cff; font-weight: 800; }
        .desc-txt { color: #8a8a9c; font-size: 12px; line-height: 1.8; max-width: 600px; white-space: pre-wrap; }
        .font-bold { font-weight: 800; color: #fff; }
        
        .inp-quadro { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px; color: #fff; width: 100%; outline: none; }
        .status-fill { font-weight: 800; color: #10d98c; border-color: rgba(16, 217, 140, 0.3); }
        .saving-box { position: absolute; top: -10px; right: -10px; background: #4f7cff; border-radius: 50%; padding: 4px; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
