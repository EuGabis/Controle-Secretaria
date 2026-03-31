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
  // BUGFIX: Garante que seleciona a primeira turma se houver, para evitar erro de salvamento
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(initialTurmas[0]?.id || '')
  
  const [customTitle, setCustomTitle] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  // Sincroniza o título quando a turma muda
  useEffect(() => {
    const turma = initialTurmas.find(t => t.id === selectedTurmaId)
    if (turma) {
      setCustomTitle(`Acompanhamento Imersão - ${turma.nome}`)
    }
  }, [selectedTurmaId, initialTurmas])

  const turmaRespostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.filter(r => r.turma_id === selectedTurmaId).forEach(r => {
      map[r.item_id] = r
    })
    return map
  }, [respostas, selectedTurmaId])

  // --- ATUALIZAÇÃO LOCAL (PARA DIGITAÇÃO) ---
  const handleLocalChange = (itemId: string, field: 'valor_texto' | 'valor_data', value: string) => {
    const existing = turmaRespostasMap[itemId]
    if (existing) {
      setRespostas(prev => prev.map(r => r.id === existing.id ? { ...r, [field]: value } : r))
    } else {
      const tempId = `temp-${itemId}-${selectedTurmaId}`
      const newResp: any = {
        id: tempId,
        item_id: itemId,
        turma_id: selectedTurmaId,
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
    if (!selectedTurmaId) {
        alert("Atenção: Selecione uma turma no seletor para poder salvar.");
        return;
    }
    
    setSaving(`cell-${itemId}`)

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
        console.error("ERRO SUPABASE:", error)
        alert(`Erro Crítico: ${error.message}`)
    } else if (data) {
        setRespostas(prev => prev.map(r => (r.item_id === itemId && r.turma_id === selectedTurmaId) ? data : r))
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
      item_n: nextN, titulo: 'Nova Etapa', contexto: 'Prazo', responsavel: 'Nome', descricao: '', tipo_campo: 'check', ordem: nextN
    }).select().single()
    if (!error && data) setItens(prev => [...prev, data])
  }

  return (
    <div className="checklist-vfinal-container">
      {/* HEADER PREMIUM REFORMULADO */}
      <div className="header-vfinal glass">
        <div className="header-vfinal-left">
           <div className="brand-badge"><DatabaseZap size={22} /></div>
           <div className="title-area">
             {/* TÍTULO EDITÁVEL DO RELATÓRIO */}
             <input 
               className="title-input-edit" 
               value={customTitle} 
               onChange={e => setCustomTitle(e.target.value)} 
               title="Clique para editar o título do relatório"
             />
             <span>Gestão de Processos - Lito Academy</span>
           </div>
        </div>

        <div className="header-vfinal-right">
           {/* SELETOR DE TURMA (RESTAURADO PARA FUNCIONAMENTO DO BANCO) */}
           <div className="turma-selector-mini">
              <Filter size={14} color="#6e6e80" />
              <select value={selectedTurmaId} onChange={e => setSelectedTurmaId(e.target.value)}>
                {initialTurmas.length > 0 ? (
                  initialTurmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)
                ) : (
                  <option value="">Nenhuma Turma Encontrada</option>
                )}
              </select>
           </div>

           <button className="btn-vfinal primary" onClick={() => {
              const headers = ['ITEM', 'PRAZO', 'RESPONSÁVEL', 'ETAPA', 'DESCRIÇÃO', 'DATA', 'STATUS']
              const csvData = [headers, ...itens.map(i => [i.item_n, i.contexto, i.responsavel, i.titulo, i.descricao, turmaRespostasMap[i.id]?.valor_data || '-', turmaRespostasMap[i.id]?.valor_texto || ''])]
              const content = csvData.map(r => r.join(';')).join('\n')
              const link = document.createElement('a'); link.href = encodeURI("data:text/csv;charset=utf-8,\uFEFF" + content); link.download = `${customTitle}.csv`; link.click()
           }}><Download size={16}/> Baixar Relatório</button>
        </div>
      </div>

      {/* TABELA PLANILHA */}
      <div className="table-viewport-vfinal glass">
        <table className="table-vfinal">
          <thead>
            <tr>
              <th className="th-vfinal center">#</th>
              <th className="th-vfinal">PRAZO</th>
              <th className="th-vfinal">RESPONSÁVEL</th>
              <th className="th-vfinal">ETAPA / ITEM DO PROCESSO</th>
              <th className="th-vfinal">DETALHAMENTO</th>
              <th className="th-vfinal">DATA REALIZAÇÃO</th>
              <th className="th-vfinal">STATUS / SITUAÇÃO (DIGITE AQUI)</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const resp = turmaRespostasMap[item.id]
              const isSaving = saving === `cell-${item.id}`
              
              return (
                <tr key={item.id} className="tr-vfinal">
                  <td className="td-vfinal center">
                    <div className="n-wrap">
                      <span className="n-badge">{item.item_n}</span>
                      {isAdmin && <button className="del-btn-vfinal" onClick={() => handleDeleteItem(item.id)}><Trash size={12}/></button>}
                    </div>
                  </td>
                  <td className="td-vfinal prazo-txt">{item.contexto}</td>
                  <td className="td-vfinal blue-txt">{item.responsavel}</td>
                  <td className="td-vfinal font-bold">
                    <div className="edit-wrap-vfinal">
                       {/* NOME DA ETAPA (EDITÁVEL PELO ADMIN) */}
                       {item.titulo}
                       {isAdmin && <button className="mini-edit-btn" onClick={() => setEditingItem(item)}><Edit3 size={11}/></button>}
                    </div>
                  </td>
                  <td className="td-vfinal desc-txt">{item.descricao}</td>
                  <td className="td-vfinal">
                    <input 
                      type="date" 
                      className="input-vfinal" 
                      value={resp?.valor_data || ''} 
                      onChange={e => handleLocalChange(item.id, 'valor_data', e.target.value)}
                      onBlur={e => performSave(item.id, { valor_data: (e.target as HTMLInputElement).value })} 
                    />
                  </td>
                  <td className="td-vfinal">
                    <div className="status-container-vfinal">
                      <input 
                        type="text" 
                        className="input-vfinal status-txt-input" 
                        placeholder="Escreva algo..."
                        value={resp?.valor_texto || ''}
                        onChange={e => handleLocalChange(item.id, 'valor_texto', e.target.value)}
                        onBlur={e => performSave(item.id, { valor_texto: (e.target as HTMLInputElement).value })}
                        onKeyDown={e => e.key === 'Enter' && performSave(item.id, { valor_texto: (e.target as HTMLInputElement).value })}
                      />
                      {isSaving && <div className="loader-vfinal"><Loader2 size={12} className="spin" /></div>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {isAdmin && (
          <div className="footer-vfinal">
            <button className="add-btn-vfinal" onClick={handleAddItem}><Plus size={16}/> Adicionar Nova Etapa ao Modelo</button>
          </div>
        )}
      </div>

      {editingItem && (
        <div className="overlay-vfinal" onClick={() => setEditingItem(null)}>
           <div className="modal-vfinal glass" onClick={e => e.stopPropagation()}>
              <div className="modal-header-vfinal"><h3>Editar Etapa #{editingItem.item_n}</h3><button onClick={() => setEditingItem(null)}><X/></button></div>
              <div className="modal-body-vfinal">
                 <div className="input-group-vfinal">
                    <label>Nome do Processo</label>
                    <input className="input-vfinal" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value})} />
                 </div>
                 <div className="input-group-vfinal">
                    <label>Responsável Padrão</label>
                    <input className="input-vfinal" value={editingItem.responsavel || ''} onChange={e => setEditingItem({...editingItem, responsavel: e.target.value})} />
                 </div>
                 <div className="input-group-vfinal">
                    <label>Descrição Detalhada</label>
                    <textarea className="input-vfinal" rows={6} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} />
                 </div>
              </div>
              <div className="modal-footer-vfinal">
                 <button className="btn-vfinal silver" onClick={() => setEditingItem(null)}>Cancelar</button>
                 <button className="btn-vfinal primary" onClick={async () => {
                    await supabase.from('checklist_itens').update(editingItem).eq('id', editingItem.id)
                    setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i))
                    setEditingItem(null)
                 }}>Salvar Alterações</button>
              </div>
           </div>
        </div>
      )}

      <style jsx>{`
        .checklist-vfinal-container { display: flex; flex-direction: column; gap: 20px; animation: fadeIn 0.4s ease; padding-bottom: 50px; }
        .glass { background: rgba(10, 10, 20, 0.95); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); }
        
        .header-vfinal { display: flex; justify-content: space-between; align-items: center; padding: 24px; }
        .header-vfinal-left { display: flex; align-items: center; gap: 16px; flex: 1; }
        .brand-badge { width: 50px; height: 50px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        
        .title-area { flex: 1; display: flex; flex-direction: column; }
        .title-input-edit { background: transparent; border: none; font-size: 28px; font-weight: 900; color: #fff; outline: none; border-bottom: 2px solid transparent; width: 90%; transition: 0.3s; }
        .title-input-edit:focus { border-color: #4f7cff; }
        .title-area span { font-size: 11px; color: #6e6e80; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }

        .header-vfinal-right { display: flex; gap: 12px; align-items: center; }
        .turma-selector-mini { background: rgba(255,255,255,0.06); padding: 0 12px; border-radius: 12px; height: 46px; border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 8px; }
        .turma-selector-mini select { background: transparent; border: none; color: #fff; font-weight: 700; font-size: 14px; outline: none; cursor: pointer; }

        .btn-vfinal { display: flex; align-items: center; gap: 10px; padding: 12px 24px; border-radius: 14px; font-size: 15px; font-weight: 800; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: 0.2s; }
        .btn-vfinal.primary { background: #4f7cff; color: #fff; }
        .btn-vfinal.silver { background: rgba(255,255,255,0.05); color: #fff; }
        .btn-vfinal:hover { transform: translateY(-3px); filter: brightness(1.2); }

        .table-viewport-vfinal { overflow: auto; max-height: 80vh; background: rgba(0,0,0,0.3); }
        .table-vfinal { width: 100%; border-collapse: collapse; min-width: 1400px; }
        .th-vfinal { position: sticky; top: 0; background: #0a0a14; padding: 20px 16px; font-size: 12px; color: #6e6e80; font-weight: 900; text-transform: uppercase; text-align: left; z-index: 10; border-bottom: 2px solid #252540; }
        .tr-vfinal:hover { background: rgba(255,255,255,0.03); }
        .td-vfinal { padding: 18px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; vertical-align: top; color: #e0e0e6; }
        
        .prazo-txt { font-weight: 700; color: #fff; }
        .blue-txt { color: #4f7cff; font-weight: 800; }
        .desc-txt { color: #8a8a9c; font-size: 12px; line-height: 1.7; max-width: 500px; white-space: pre-wrap; }
        
        .n-badge { background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 8px; font-weight: 900; font-size: 12px; color: #4f7cff; }
        .del-btn-vfinal { background: none; border: none; color: #ff4d6a; opacity: 0; cursor: pointer; transition: 0.2s; }
        .tr-vfinal:hover .del-btn-vfinal { opacity: 0.5; }
        
        .edit-wrap-vfinal { display: flex; justify-content: space-between; align-items: start; gap: 10px; }
        .mini-edit-btn { background: none; border: none; color: #4f7cff; opacity: 0; cursor: pointer; transition: 0.3s; }
        .tr-vfinal:hover .mini-edit-btn { opacity: 0.8; }

        .input-vfinal { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; color: #fff; width: 100%; outline: none; font-size: 14px; transition: 0.2s; }
        .input-vfinal:focus { border-color: #4f7cff; background: rgba(79,124,255,0.08); }
        .status-txt-input { font-weight: 800; color: #10d98c; border-color: rgba(16, 217, 140, 0.2); }
        
        .status-container-vfinal { position: relative; }
        .loader-vfinal { position: absolute; top: -8px; right: -8px; background: #4f7cff; border-radius: 50%; padding: 4px; }

        .footer-vfinal { padding: 30px; display: flex; justify-content: center; }
        .add-btn-vfinal { display: flex; align-items: center; gap: 10px; padding: 15px 30px; border-radius: 16px; background: rgba(255,255,255,0.04); border: 2px dashed rgba(255,255,255,0.2); color: #9494a3; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .add-btn-vfinal:hover { border-color: #4f7cff; color: #fff; background: rgba(79,124,255,0.1); }

        /* MODAL */
        .overlay-vfinal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-vfinal { width: 650px; overflow: hidden; }
        .modal-header-vfinal { padding: 30px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; }
        .modal-body-vfinal { padding: 30px; display: flex; flex-direction: column; gap: 20px; }
        .input-group-vfinal { display: flex; flex-direction: column; gap: 8px; }
        .input-group-vfinal label { font-size: 11px; font-weight: 800; color: #6e6e80; text-transform: uppercase; }
        .modal-footer-vfinal { padding: 25px 30px; display: flex; justify-content: flex-end; gap: 15px; background: rgba(255,255,255,0.02); }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
