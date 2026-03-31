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
  // Define a turma padrão (primeira da lista)
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

  // Map de respostas para acesso rápido
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
      const tempId = `temp-${itemId}`
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
  // Função que realmente envia para o Supabase
  const performSave = async (itemId: string, updates: Partial<ChecklistResposta>) => {
    if (!selectedTurmaId) {
        alert("Erro: Nenhuma turma selecionada para salvar.");
        return;
    }
    
    setSaving(`cell-${itemId}`)
    console.log("Tentando salvar:", { itemId, updates, selectedTurmaId });

    // Tenta salvar usando UPSERT (Insere se não existe, atualiza se existe)
    const { data, error } = await supabase
        .from('checklist_respostas')
        .upsert({
            item_id: itemId,
            turma_id: selectedTurmaId,
            ...updates,
            respondido_por: usuarioId,
            updated_at: new Date().toISOString()
        }, { onConflict: 'item_id,turma_id' }) // Isso exige a constraint UNIQUE no banco
        .select()
        .single()

    if (error) {
        console.error("ERRO CRÍTICO AO SALVAR NO SUPABASE:", error)
        alert(`NÃO SALVOU NO BANCO:\n${error.message}\n\nCertifique-se de que rodou o SQL da CONSTRAINT UNIQUE.`)
    } else if (data) {
        console.log("Salvo com sucesso:", data)
        // Atualiza a lista oficial com o objeto que veio do banco (com ID real)
        setRespostas(prev => prev.map(r => (r.item_id === itemId && r.turma_id === selectedTurmaId) ? data : r))
    }

    setTimeout(() => setSaving(null), 300)
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
      item_n: nextN, titulo: 'Nova Etapa', contexto: 'Prazo', responsavel: 'Nome', descricao: '', tipo_campo: 'check', ordem: nextN
    }).select().single()
    if (!error && data) setItens(prev => [...prev, data])
  }

  return (
    <div className="checklist-v5-container">
      {/* CABEÇALHO */}
      <div className="header-v5 glass">
        <div className="header-v5-left">
           <div className="brand-badge"><DatabaseZap size={22} /></div>
           <div className="title-area">
             <input className="title-input" value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
             <span>Gestão de Acompanhamento Profissional - Lito Academy</span>
           </div>
        </div>
        <div className="header-v5-right">
           <button className="btn-v5 primary" onClick={() => {
              const headers = ['ITEM', 'PRAZO', 'RESPONSÁVEL', 'ETAPA', 'DESCRIÇÃO', 'DATA', 'STATUS']
              const csvData = [headers, ...itens.map(i => [i.item_n, i.contexto, i.responsavel, i.titulo, i.descricao, turmaRespostasMap[i.id]?.valor_data || '-', turmaRespostasMap[i.id]?.valor_texto || ''])]
              const content = csvData.map(r => r.join(';')).join('\n')
              const link = document.createElement('a'); link.href = encodeURI("data:text/csv;charset=utf-8,\uFEFF" + content); link.download = `${customTitle}.csv`; link.click()
           }}><Download size={16}/> Exportar tudo</button>
        </div>
      </div>

      {/* TABELA PLANILHA */}
      <div className="table-viewport-v5 glass">
        <table className="table-v5">
          <thead>
            <tr>
              <th className="th-v5 center">#</th>
              <th className="th-v5">PRAZO</th>
              <th className="th-v5">RESPONSÁVEL</th>
              <th className="th-v5">ETAPA / ITEM DO PROCESSO</th>
              <th className="th-v5">DETALHAMENTO</th>
              <th className="th-v5">DATA</th>
              <th className="th-v5">STATUS / SITUAÇÃO (DIGITE AQUI)</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const resp = turmaRespostasMap[item.id]
              const isSaving = saving === `cell-${item.id}`
              
              return (
                <tr key={item.id} className="tr-v5">
                  <td className="td-v5 center">
                    <div className="n-wrap">
                      <span className="n-text">{item.item_n}</span>
                      {isAdmin && <button className="del-btn" onClick={() => handleDeleteItem(item.id)}><Trash size={12}/></button>}
                    </div>
                  </td>
                  <td className="td-v5 prazo-text">{item.contexto}</td>
                  <td className="td-v5 blue-text">{item.responsavel}</td>
                  <td className="td-v5 font-bold">
                    <div className="edit-wrap">
                       {item.titulo}
                       {isAdmin && <button className="edit-btn" onClick={() => setEditingItem(item)}><Edit size={10}/></button>}
                    </div>
                  </td>
                  <td className="td-v5 desc-text">{item.descricao}</td>
                  <td className="td-v5">
                    <input 
                      type="date" 
                      className="input-v5" 
                      value={resp?.valor_data || ''} 
                      onChange={e => handleLocalChange(item.id, 'valor_data', e.target.value)}
                      onBlur={e => performSave(item.id, { valor_data: (e.target as HTMLInputElement).value })} 
                    />
                  </td>
                  <td className="td-v5">
                    <div className="status-container-v5">
                      <input 
                        type="text" 
                        className="input-v5 status-input" 
                        placeholder="Escreva algo..."
                        value={resp?.valor_texto || ''}
                        onChange={e => handleLocalChange(item.id, 'valor_texto', e.target.value)}
                        onBlur={e => performSave(item.id, { valor_texto: (e.target as HTMLInputElement).value })}
                        onKeyDown={e => e.key === 'Enter' && performSave(item.id, { valor_texto: (e.target as HTMLInputElement).value })}
                      />
                      {isSaving && <div className="loader-v5"><Loader2 size={12} className="spin" /></div>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {isAdmin && (
          <div className="footer-v5">
            <button className="add-btn-v5" onClick={handleAddItem}><Plus size={16}/> Adicionar Nova Linha</button>
          </div>
        )}
      </div>

      {editingItem && (
        <div className="overlay-v5" onClick={() => setEditingItem(null)}>
           <div className="modal-v5 glass" onClick={e => e.stopPropagation()}>
              <div className="modal-header-v5"><h3>Editar Etapa #{editingItem.item_n}</h3><button onClick={() => setEditingItem(null)}><X/></button></div>
              <div className="modal-body-v5">
                 <div className="modal-group">
                   <label>Título</label>
                   <input className="input-v5" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value})} />
                 </div>
                 <div className="modal-group">
                   <label>Descrição</label>
                   <textarea className="input-v5" rows={5} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} />
                 </div>
              </div>
              <div className="modal-footer-v5">
                 <button className="btn-v5 silver" onClick={() => setEditingItem(null)}>Cancelar</button>
                 <button className="btn-v5 primary" onClick={async () => {
                    await supabase.from('checklist_itens').update(editingItem).eq('id', editingItem.id)
                    setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i))
                    setEditingItem(null)
                 }}>Salvar</button>
              </div>
           </div>
        </div>
      )}

      <style jsx>{`
        .checklist-v5-container { display: flex; flex-direction: column; gap: 20px; animation: fadeIn 0.4s ease; padding-bottom: 50px; }
        .glass { background: rgba(10, 10, 18, 0.9); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; }
        
        .header-v5 { display: flex; justify-content: space-between; align-items: center; padding: 24px; }
        .header-v5-left { display: flex; align-items: center; gap: 16px; flex: 1; }
        .brand-badge { width: 50px; height: 50px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 30px rgba(79,124,255,0.4); }
        .title-area { flex: 1; }
        .title-input { background: transparent; border: none; font-size: 26px; font-weight: 900; color: #fff; outline: none; width: 100%; border-bottom: 2px solid transparent; transition: 0.3s; }
        .title-input:focus { border-color: #4f7cff; }
        .title-area span { font-size: 11px; color: #6e6e80; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; }

        .btn-v5 { display: flex; align-items: center; gap: 10px; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 800; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: 0.2s; }
        .btn-v5.primary { background: #4f7cff; color: #fff; }
        .btn-v5.silver { background: rgba(255,255,255,0.05); color: #fff; }

        .table-viewport-v5 { overflow: auto; max-height: 80vh; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); }
        .table-v5 { width: 100%; border-collapse: collapse; min-width: 1300px; }
        .th-v5 { position: sticky; top: 0; background: #0f0f1a; padding: 20px 16px; font-size: 11px; color: #6e6e80; font-weight: 900; text-transform: uppercase; text-align: left; z-index: 10; border-bottom: 2px solid #252540; }
        .tr-v5:hover { background: rgba(255,255,255,0.02); }
        .td-v5 { padding: 18px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 14px; vertical-align: top; color: #e0e0e6; }
        
        .prazo-text { font-weight: 700; color: #fff; }
        .blue-text { color: #4f7cff; font-weight: 800; }
        .desc-text { color: #8a8a9c; font-size: 12px; line-height: 1.7; max-width: 500px; white-space: pre-wrap; }
        
        .n-badge { background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 8px; font-weight: 900; font-size: 12px; }
        .del-btn { background: none; border: none; color: #ff4d6a; opacity: 0; cursor: pointer; transition: 0.2s; }
        .tr-v5:hover .del-btn { opacity: 0.5; }
        
        .input-v5 { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px; color: #fff; width: 100%; outline: none; font-size: 14px; transition: 0.2s; }
        .input-v5:focus { border-color: #4f7cff; background: rgba(79,124,255,0.08); }
        .status-input { font-weight: 800; color: #10d98c; border: 1px solid rgba(16, 217, 140, 0.2); }
        
        .status-container-v5 { position: relative; }
        .loader-v5 { position: absolute; top: -8px; right: -8px; background: #4f7cff; border-radius: 50%; padding: 4px; }

        .footer-v5 { padding: 30px; display: flex; justify-content: center; }
        .add-btn-v5 { display: flex; align-items: center; gap: 8px; padding: 15px 30px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1.5px dashed rgba(255,255,255,0.15); color: #9494a3; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .add-btn-v5:hover { border-color: #4f7cff; color: #fff; background: rgba(79,124,255,0.05); }

        /* MODAL */
        .overlay-v5 { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-v5 { width: 600px; padding: 0; overflow: hidden; }
        .modal-header-v5 { padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; }
        .modal-body-v5 { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .modal-footer-v5 { padding: 20px 24px; display: flex; justify-content: flex-end; gap: 12px; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
