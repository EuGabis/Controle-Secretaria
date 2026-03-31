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
  // Sem filtro: Usa a primeira turma por padrão ou a selecionada
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

  // --- ATUALIZAÇÃO LOCAL (PARA DIGITAÇÃO) ---
  const handleLocalChange = (itemId: string, field: 'valor_texto' | 'valor_data', value: string) => {
    const existing = turmaRespostasMap[itemId]
    if (existing) {
      setRespostas(prev => prev.map(r => r.id === existing.id ? { ...r, [field]: value } : r))
    } else {
      // Se não existe, cria um objeto temporário no estado
      const tempId = `temp-${itemId}`
      const newResp: ChecklistResposta = {
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
  const saveValue = async (itemId: string, updates: Partial<ChecklistResposta>) => {
    if (!selectedTurmaId) return
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
        console.error("Erro no salvamento:", error)
        alert(`Erro ao salvar no banco: ${error.message}`)
    } else if (data) {
        // Atualiza com o ID real do banco
        setRespostas(prev => prev.map(r => (r.item_id === itemId && r.turma_id === selectedTurmaId) ? data : r))
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
    <div className="checklist-v4-container">
      {/* CABEÇALHO SEM FILTRO */}
      <div className="header-v4 glass">
        <div className="header-v4-left">
           <div className="brand-badge"><DatabaseZap size={22} /></div>
           <div className="title-area">
             <input className="title-input" value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
             <span>Controle de Acompanhamento Profissional</span>
           </div>
        </div>
        <div className="header-v4-right">
           <button className="btn-v4 primary" onClick={() => {
              const csv = [
                ['ITEM', 'PRAZO', 'RESPONSÁVEL', 'ETAPA', 'DESCRIÇÃO', 'DATA', 'STATUS'],
                ...itens.map(i => [i.item_n, i.contexto, i.responsavel, i.titulo, i.descricao, turmaRespostasMap[i.id]?.valor_data || '-', turmaRespostasMap[i.id]?.valor_texto || ''])
              ].map(r => r.join(';')).join('\n')
              const link = document.createElement('a'); link.href = encodeURI("data:text/csv;charset=utf-8,\uFEFF" + csv); link.download = `${customTitle}.csv`; link.click()
           }}><Download size={16}/> Exportar Relatório</button>
        </div>
      </div>

      {/* TABELA PLANILHA */}
      <div className="table-container-v4 glass">
        <table className="table-v4">
          <thead>
            <tr>
              <th className="th-v4 center">#</th>
              <th className="th-v4">PRAZO</th>
              <th className="th-v4">RESPONSÁVEL</th>
              <th className="th-v4">ETAPA / ITEM DO PROCESSO</th>
              <th className="th-v4">DESCRIÇÃO DETALHADA</th>
              <th className="th-v4">DATA</th>
              <th className="th-v4">STATUS (DIGITE FEITO / NÃO / EM BREVE)</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const resp = turmaRespostasMap[item.id]
              const isSaving = saving === `cell-${item.id}`
              
              return (
                <tr key={item.id} className="tr-v4">
                  <td className="td-v4 center">
                    <div className="n-wrap">
                      <span className="n-text">{item.item_n}</span>
                      {isAdmin && <button className="del-btn" onClick={() => handleDeleteItem(item.id)}><Trash size={12}/></button>}
                    </div>
                  </td>
                  <td className="td-v4 font-bold">{item.contexto}</td>
                  <td className="td-v3 blue-text">{item.responsavel}</td>
                  <td className="td-v4 font-bold">
                    <div className="edit-wrap">
                       {item.titulo}
                       {isAdmin && <button className="edit-btn" onClick={() => setEditingItem(item)}><Edit size={10}/></button>}
                    </div>
                  </td>
                  <td className="td-v4 desc-text">{item.descricao}</td>
                  <td className="td-v4">
                    <input 
                      type="date" 
                      className="input-v4" 
                      value={resp?.valor_data || ''} 
                      onChange={e => handleLocalChange(item.id, 'valor_data', e.target.value)}
                      onBlur={e => saveValue(item.id, { valor_data: e.target.value })} 
                    />
                  </td>
                  <td className="td-v4">
                    <div className="status-wrap-v4">
                      {/* QUALQUER USUÁRIO PODE ESCREVER AQUI */}
                      <input 
                        type="text" 
                        className="input-v4 status-text-input" 
                        placeholder="Escreva o status..."
                        value={resp?.valor_texto || ''}
                        onChange={e => handleLocalChange(item.id, 'valor_texto', e.target.value)}
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
        {isAdmin && <div className="footer-v4"><button className="add-btn-v4" onClick={handleAddItem}><Plus size={16}/> Adicionar Etapa</button></div>}
      </div>

      {editingItem && (
        <div className="overlay-v4" onClick={() => setEditingItem(null)}>
           <div className="modal-v4 glass" onClick={e => e.stopPropagation()}>
              <div className="modal-header-v4"><h3>Editar #{editingItem.item_n}</h3><button onClick={() => setEditingItem(null)}><X/></button></div>
              <div className="modal-body-v4">
                 <input className="input-v4" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value})} placeholder="Título" />
                 <textarea className="input-v4" rows={5} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} placeholder="Descrição" />
              </div>
              <div className="modal-footer-v4">
                 <button className="btn-v4 silver" onClick={() => setEditingItem(null)}>Cancelar</button>
                 <button className="btn-v4 primary" onClick={async () => {
                    await supabase.from('checklist_itens').update(editingItem).eq('id', editingItem.id)
                    setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i))
                    setEditingItem(null)
                 }}>Salvar Alterações</button>
              </div>
           </div>
        </div>
      )}

      <style jsx>{`
        .checklist-v4-container { display: flex; flex-direction: column; gap: 20px; animation: fadeIn 0.4s ease; padding-bottom: 50px; }
        .glass { background: rgba(15, 15, 25, 0.9); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; }
        
        .header-v4 { display: flex; justify-content: space-between; align-items: center; padding: 24px; }
        .header-v4-left { display: flex; align-items: center; gap: 16px; flex: 1; }
        .brand-badge { width: 50px; height: 50px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 30px rgba(79,124,255,0.4); }
        .title-area { flex: 1; }
        .title-input { background: transparent; border: none; font-size: 28px; font-weight: 900; color: #fff; outline: none; width: 100%; border-bottom: 2px solid transparent; transition: 0.3s; }
        .title-input:focus { border-color: #4f7cff; }
        .title-area span { font-size: 11px; color: #6e6e80; text-transform: uppercase; font-weight: 800; letter-spacing: 2px; }

        .header-v4-right { display: flex; gap: 12px; align-items: center; }
        
        .btn-v4 { display: flex; align-items: center; gap: 10px; padding: 12px 24px; border-radius: 14px; font-size: 15px; font-weight: 800; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: 0.2s; }
        .btn-v4.primary { background: #4f7cff; color: #fff; box-shadow: 0 4px 20px rgba(79,124,255,0.3); }
        .btn-v4.silver { background: rgba(255,255,255,0.05); color: #fff; }
        .btn-v4:hover { transform: translateY(-3px) scale(1.02); filter: brightness(1.2); }

        .table-container-v4 { overflow: auto; max-height: 80vh; border: 1px solid rgba(255,255,255,0.05); }
        .table-v4 { width: 100%; border-collapse: collapse; min-width: 1300px; }
        .th-v4 { position: sticky; top: 0; background: #0f0f1a; padding: 20px 16px; font-size: 12px; color: #6e6e80; font-weight: 900; text-transform: uppercase; text-align: left; z-index: 10; border-bottom: 3px solid #252540; }
        .tr-v4:hover { background: rgba(255,255,255,0.03); }
        .td-v4 { padding: 18px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; vertical-align: top; color: #e0e0e6; }
        
        .center { text-align: center; }
        .font-bold { font-weight: 800; color: #fff; }
        .blue-text { color: #4f7cff; font-weight: 800; }
        .desc-text { color: #8a8a9c; font-size: 12px; line-height: 1.7; max-width: 500px; white-space: pre-wrap; font-family: inherit; }
        
        .n-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .n-text { background: rgba(255,255,255,0.08); padding: 5px 10px; border-radius: 8px; font-weight: 900; font-size: 12px; color: #4f7cff; }
        .del-btn { background: none; border: none; color: #ff4d6a; opacity: 0; cursor: pointer; transition: 0.2s; }
        .tr-v4:hover .del-btn { opacity: 0.6; }
        
        .edit-wrap { display: flex; justify-content: space-between; gap: 10px; }
        .edit-btn { background: none; border: none; color: #4f7cff; opacity: 0; cursor: pointer; transition: 0.3s; }
        .tr-v4:hover .edit-btn { opacity: 0.8; }

        .input-v4 { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; color: #fff; width: 100%; outline: none; font-size: 14px; transition: 0.2s; }
        .input-v4:focus { border-color: #4f7cff; background: rgba(79,124,255,0.08); box-shadow: 0 0 15px rgba(79,124,255,0.1); }
        .status-text-input { font-weight: 800; color: #10d98c; } /* Texto do status em verde vibrante ao digitar */
        .status-wrap-v4 { position: relative; }
        .saving-icon { position: absolute; top: -8px; right: -8px; color: #4f7cff; background: #0f0f1a; border-radius: 50%; }

        .footer-v4 { padding: 30px; display: flex; justify-content: center; }
        .add-btn-v4 { display: flex; align-items: center; gap: 10px; padding: 15px 30px; border-radius: 16px; background: rgba(255,255,255,0.04); border: 2px dashed rgba(255,255,255,0.2); color: #9494a3; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .add-btn-v4:hover { border-color: #4f7cff; color: #fff; background: rgba(79,124,255,0.1); transform: scale(1.05); }

        .overlay-v4 { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-v4 { width: 650px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
        .modal-header-v4 { padding: 30px; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .modal-body-v4 { padding: 30px; display: flex; flex-direction: column; gap: 20px; }
        .modal-footer-v4 { padding: 25px 30px; display: flex; justify-content: flex-end; gap: 15px; background: rgba(255,255,255,0.02); }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
