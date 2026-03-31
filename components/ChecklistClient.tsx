'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Edit3, CheckCircle2, Circle, 
  Calendar, Type, Save, Loader2, X, ChevronRight, 
  Settings2, GripVertical, User2, Clock, ExternalLink,
  Download, Filter, Search, Info, DatabaseZap,
  Check, AlertCircle, HelpCircle, Trash, Edit, UploadCloud,
  FileDown, FileUp, FileSpreadsheet, User
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
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importReplace, setImportReplace] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  useEffect(() => {
    const globalTurma = initialTurmas.find(t => t.id === GLOBAL_TURMA_ID)
    if (globalTurma) {
      setCustomTitle(globalTurma.nome || 'Checklist de Imersão - Padrão')
      // @ts-ignore
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
    const payload = {
        item_id: itemId, turma_id: GLOBAL_TURMA_ID, ...updates,
        respondido_por: usuarioId, updated_at: new Date().toISOString()
    }
    const { data, error } = await supabase.from('checklist_respostas').upsert(payload, { onConflict: 'item_id,turma_id' }).select().single()
    if (!error && data) setRespostas(prev => prev.map(r => (r.item_id === itemId) ? data : r))
    setTimeout(() => setSaving(null), 300)
  }

  const handleDeleteItem = async (id: string) => {
    if (!isAdmin || !confirm('Excluir esta etapa permanentemente?')) return
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

  const exportToExcel = () => {
    const fileName = `${customTitle}.xls`
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta http-equiv="content-type" content="text/plain; charset=UTF-8"><style>table { border-collapse: collapse; } th { background-color: #4f7cff; color: #fff; border: 1px solid #ddd; } td { border: 1px solid #ddd; padding: 5px; }</style></head>
      <body>
        <table>
          <tr><td colspan="7" style="font-size:20px; font-weight:bold; text-align:center">${customTitle}</td></tr>
          <tr><td colspan="7" style="text-align:center">${customSub}</td></tr>
          <thead><tr><th>#</th><th>PRAZO</th><th>RESPONSÁVEL</th><th>ETAPA</th><th>DETALHES</th><th>DATA</th><th>STATUS</th></tr></thead>
          <tbody>
            ${itens.map(i => `<tr><td>${i.item_n}</td><td>${i.contexto || ''}</td><td>${i.responsavel || ''}</td><td>${i.titulo}</td><td>${i.descricao || ''}</td><td>${turmaRespostasMap[i.id]?.valor_data || ''}</td><td>${turmaRespostasMap[i.id]?.valor_texto || ''}</td></tr>`).join('')}
          </tbody>
        </table>
      </body></html>
    `
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = fileName; link.click()
  }

  const processImport = async () => {
    if (!importFile || !isAdmin) return
    setIsImporting(true)
    try {
      const text = await importFile.text()
      const delimiter = text.includes(';') ? ';' : ','
      const rows = text.split(/\r?\n/).filter(line => line.trim().length > 0)
      const newItems: any[] = []
      rows.forEach((row, index) => {
          if (index === 0 && (row.toLowerCase().includes('item') || row.toLowerCase().includes('#'))) return
          const cols = row.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''))
          let item_n = parseInt(cols[0]) || index + 1
          let contexto = cols[1] || ''
          let responsavel = cols[2] || ''
          let titulo = cols[3] || cols[0]
          let descricao = cols[4] || ''
          if (titulo.match(/^\d+[\.\s]/)) titulo = titulo.replace(/^\d+[\.\s]+/, '')
          if (titulo) newItems.push({ item_n, titulo, responsavel, contexto, descricao, tipo_campo: 'check', ordem: item_n })
      })
      if (importReplace) await supabase.from('checklist_itens').delete().neq('id', 'placeholder')
      const { data } = await supabase.from('checklist_itens').insert(newItems).select()
      if (data) setItens(data)
      setIsImportModalOpen(false)
      alert("Sucesso!")
    } catch (err: any) { alert(err.message) } finally { setIsImporting(false) }
  }

  return (
    <div className="checklist-full-config-container">
      {/* CABEÇALHO */}
      <div className="h-v7 glass">
        <div className="h-v7-left">
           <div className="h-v7-badge"><DatabaseZap size={22} /></div>
           <div className="h-v7-info">
             <div className="h-v7-title-row">
                <input className="h-v7-title-input" value={customTitle} onChange={e => setCustomTitle(e.target.value)} onBlur={e => saveHeader('nome', e.target.value)} />
                {saving === 'header' && <Loader2 size={12} className="spin blue" />}
             </div>
             <input className="h-v7-sub-input" value={customSub} onChange={e => setCustomSub(e.target.value)} onBlur={e => saveHeader('descricao', e.target.value)} />
           </div>
        </div>
        <div className="h-v7-right">
           {isAdmin && <button className="h-btn-v7 silver purple" onClick={() => setIsImportModalOpen(true)}><FileUp size={16}/> Importar</button>}
           <button className="h-btn-v7 primary" onClick={exportToExcel}><FileSpreadsheet size={16}/> Exportar Excel</button>
        </div>
      </div>

      {/* PLANILHA */}
      <div className="viewport-v7 glass">
        <table className="table-v7">
          <thead>
            <tr>
              <th className="th-v7 center">#</th>
              <th className="th-v7">PRAZO</th>
              <th className="th-v7">RESPONSÁVEL</th>
              <th className="th-v7">ETAPA DO PROCESSO</th>
              <th className="th-v7">DETALHAMENTO</th>
              <th className="th-v7">DATA REALIZAÇÃO</th>
              <th className="th-v7">SITUAÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const resp = turmaRespostasMap[item.id]
              const isSaving = saving === `cell-${item.id}`
              return (
                <tr key={item.id} className="tr-v7">
                  <td className="td-v7 center">
                    <div className="n-col-v7"><span className="n-pill-v7">{item.item_n}</span>{isAdmin && <button className="trash-v7" onClick={() => handleDeleteItem(item.id)}><Trash size={12}/></button>}</div>
                  </td>
                  <td className="td-v7 font-bold color-w">{item.contexto}</td>
                  <td className="td-v7 blue">{item.responsavel}</td>
                  <td className="td-v7 font-bold">
                    <div className="edit-box-v7">
                       {item.titulo}
                       {isAdmin && <button className="pencil-v7" onClick={() => setEditingItem(item)}><Edit3 size={11}/></button>}
                    </div>
                  </td>
                  <td className="td-v7 desc-v7">{item.descricao}</td>
                  <td className="td-v7"><input type="date" className="inp-v7" value={resp?.valor_data || ''} onChange={e => handleLocalChange(item.id, 'valor_data', e.target.value)} onBlur={e => performSave(item.id, { valor_data: e.target.value })} /></td>
                  <td className="td-v7"><div className="status-v7"><input type="text" className="inp-v7 green-txt" placeholder="..." value={resp?.valor_texto || ''} onChange={e => handleLocalChange(item.id, 'valor_texto', e.target.value)} onBlur={e => performSave(item.id, { valor_texto: e.target.value })} />{isSaving && <div className="save-v7"><Loader2 size={10} className="spin" /></div>}</div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {isAdmin && <div className="footer-v7"><button className="add-v7" onClick={handleAddItem}><Plus size={16}/> Adicionar Etapa ao Plano</button></div>}
      </div>

      {/* MODAL DE EDIÇÃO COMPLETA */}
      {editingItem && (
        <div className="overlay-v7" onClick={() => setEditingItem(null)}>
           <div className="modal-v7 glass" onClick={e => e.stopPropagation()}>
              <div className="modal-v7-h">
                 <div className="row">
                    <Edit3 size={20} className="blue" />
                    <h3 style={{marginLeft: 12}}>Configuração da Etapa #{editingItem.item_n}</h3>
                 </div>
                 <button onClick={() => setEditingItem(null)} className="close-btn"><X/></button>
              </div>
              <div className="modal-v7-b">
                 <div className="row-split">
                    <div className="group-v7 flex-1">
                      <label>Nº Ordem</label>
                      <input type="number" className="inp-v7" value={editingItem.item_n} onChange={e => setEditingItem({...editingItem, item_n: parseInt(e.target.value)})} />
                    </div>
                    <div className="group-v7 flex-2">
                       <label>Prazo / Meta</label>
                       <input className="inp-v7" value={editingItem.contexto || ''} onChange={e => setEditingItem({...editingItem, contexto: e.target.value})} />
                    </div>
                 </div>

                 <div className="group-v7">
                    <label>Responsável Padrão</label>
                    <input className="inp-v7" value={editingItem.responsavel || ''} onChange={e => setEditingItem({...editingItem, responsavel: e.target.value})} placeholder="Ex: MOACIR NETO" />
                 </div>

                 <div className="group-v7">
                    <label>Título da Etapa (Item do Processo)</label>
                    <input className="inp-v7 font-bold" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value})} />
                 </div>

                 <div className="group-v7">
                    <label>Descrição Detalhada / Instruções</label>
                    <textarea className="inp-v7" rows={7} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} placeholder="Escreva o passo a passo aqui..." />
                 </div>
              </div>
              <div className="modal-v7-f">
                 <button className="h-btn-v7 silver" onClick={() => setEditingItem(null)}>Cancelar</button>
                 <button className="h-btn-v7 primary shadow" onClick={async () => {
                    await supabase.from('checklist_itens').update(editingItem).eq('id', editingItem.id)
                    setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i)); setEditingItem(null)
                 }}><Save size={16}/> Salvar Alterações</button>
              </div>
           </div>
        </div>
      )}

      {/* IMPORT MODAL (REDUZIDO) */}
      {isImportModalOpen && (
        <div className="overlay-v7" onClick={() => setIsImportModalOpen(false)}>
           <div className="modal-v7 glass mini" onClick={e => e.stopPropagation()}>
              <div className="modal-v7-h"><h3>Importar CSV</h3><button onClick={() => setIsImportModalOpen(false)}><X/></button></div>
              <div className="modal-v7-b">
                 <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)} />
                 <label style={{display:'flex', gap:10, marginTop:15}}><input type="checkbox" checked={importReplace} onChange={e => setImportReplace(e.target.checked)} /> <span style={{color:'#ff4d6a', fontSize:12, fontWeight:700}}>⚠️ Substituir Etapas Atuais</span></label>
              </div>
              <div className="modal-v7-f"><button className="h-btn-v7 primary" onClick={processImport} disabled={!importFile}>Iniciar</button></div>
           </div>
        </div>
      )}

      <style jsx>{`
        .checklist-full-config-container { display: flex; flex-direction: column; gap: 15px; animation: fadeIn 0.4s ease; padding-bottom: 50px; color: #fff; }
        .glass { background: rgba(8, 8, 16, 0.98); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
        
        .h-v7 { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-radius: 14px; }
        .h-v7-left { display: flex; align-items: center; gap: 16px; flex: 1; }
        .h-v7-badge { width: 42px; height: 42px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(79,124,255,0.2); }
        .h-v7-info { flex: 1; }
        .h-v7-title-row { display: flex; align-items: center; gap: 10px; }
        .h-v7-title-input { background: transparent; border: none; font-size: 18px; font-weight: 800; color: #fff; outline: none; width: 450px; border-bottom: 2px solid transparent; }
        .h-v7-title-input:focus { border-color: #4f7cff; }
        .h-v7-sub-input { background: transparent; border: none; font-size: 10px; color: #6e6e80; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; outline: none; width: 100%; }

        .h-btn-v7 { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid rgba(255,255,255,0.06); transition: 0.2s; }
        .h-btn-v7.primary { background: #4f7cff; color: #fff; border: none; }
        .h-btn-v7.silver { background: rgba(255,255,255,0.04); color: #fff; }
        .h-btn-v7:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .h-btn-v7.purple { border-color: #8b5cf6; color: #a786ff; }
        .shadow { box-shadow: 0 4px 20px rgba(79,124,255,0.3); }

        .viewport-v7 { overflow: auto; max-height: 80vh; background: rgba(0,0,0,0.2); }
        .table-v7 { width: 100%; border-collapse: collapse; min-width: 1450px; }
        .th-v7 { position: sticky; top: 0; background: #080811; padding: 14px; font-size: 10px; color: #6e6e80; font-weight: 800; text-transform: uppercase; text-align: left; z-index: 10; border-bottom: 2px solid #202035; }
        .tr-v7:hover { background: rgba(255,255,255,0.02); }
        .td-v7 { padding: 14px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; vertical-align: top; }
        
        .blue { color: #4f7cff; }
        .desc-v7 { color: #8a8a9c; font-size: 11px; line-height: 1.6; max-width: 550px; white-space: pre-wrap; }
        .font-bold { font-weight: 700; }
        .color-w { color: #fff; }
        
        .n-col-v7 { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .n-pill-v7 { background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 12px; color: #4f7cff; }
        .trash-v7 { background: none; border: none; color: #ff4d6a; opacity: 0; cursor: pointer; transition: 0.2s; }
        .tr-v7:hover .trash-v7 { opacity: 0.5; }
        
        .edit-box-v7 { display: flex; justify-content: space-between; gap: 10px; }
        .pencil-v7 { background: none; border: none; color: #4f7cff; opacity: 0; cursor: pointer; transition: 0.2s; }
        .tr-v7:hover .pencil-v7 { opacity: 0.8; }

        .inp-v7 { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px; color: #fff; width: 100%; outline: none; font-size: 13px; transition: 0.2s; }
        .inp-v7:focus { border-color: #4f7cff; background: rgba(79,124,255,0.06); }
        .green-txt { color: #10d98c; font-weight: 700; border-color: rgba(16, 217, 140, 0.1); }
        
        .status-v7 { position: relative; width: 220px; }
        .save-v7 { position: absolute; top: -8px; right: -8px; background: #4f7cff; border-radius: 50%; padding: 4px; box-shadow: 0 0 10px rgba(79,124,255,0.4); }

        .footer-v7 { padding: 20px; display: flex; justify-content: center; }
        .add-v7 { padding: 12px 24px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1.5px dashed rgba(255,255,255,0.1); color: #9494a3; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .add-v7:hover { border-color: #4f7cff; color: #fff; }

        /* MODAL */
        .overlay-v7 { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-v7 { width: 680px; overflow: hidden; animation: zoomIn 0.3s ease; }
        .modal-v7.mini { width: 400px; }
        .modal-v7-h { padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
        .modal-v7-b { padding: 24px; display: flex; flex-direction: column; gap: 18px; }
        .modal-v7-f { padding: 20px 24px; display: flex; justify-content: flex-end; gap: 12px; background: rgba(255,255,255,0.01); }
        
        .group-v7 { display: flex; flex-direction: column; gap: 6px; }
        .group-v7 label { font-size: 10px; font-weight: 800; color: #6e6e80; text-transform: uppercase; letter-spacing: 0.5px; }
        .row-split { display: flex; gap: 15px; }
        .flex-1 { flex: 1; }
        .flex-2 { flex: 2; }
        .row { display: flex; align-items: center; }
        .close-btn { background: none; border: none; color: #6e6e80; cursor: pointer; transition: 0.2s; }
        .close-btn:hover { color: #fff; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
