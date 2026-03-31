'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Edit3, Save, Loader2, X, Download, DatabaseZap,
  UploadCloud, FileDown, FileUp, FileSpreadsheet, 
  ExternalLink, Edit
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
      setCustomTitle(globalTurma.nome || 'CHECKLIST DE IMERSÃO - PADRÃO')
      // @ts-ignore
      setCustomSub(globalTurma.descricao || 'GESTÃO DE PROCESSOS E IMERSÕES - LITO ACADEMY')
    }
  }, [initialTurmas])

  const turmaRespostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.forEach(r => { map[r.item_id] = r })
    return map
  }, [respostas])

  const renderFormattedText = (text: string | null) => {
    if (!text) return '-'
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const url = part.startsWith('http') ? part : `https://${part}`
        return <a key={i} href={url} target="_blank" rel="noreferrer" style={{color: '#4f7cff', textDecoration: 'underline', fontWeight: '800'}}>{part} <ExternalLink size={10} style={{display:'inline'}}/></a>
      }
      return part
    })
  }

  // --- PERSISTÊNCIA ---
  const saveHeader = async (field: 'nome' | 'descricao', value: string) => {
    setSaving('header'); const update: any = { id: GLOBAL_TURMA_ID }; update[field] = value.toUpperCase()
    await supabase.from('checklist_turmas').upsert(update, { onConflict: 'id' })
    setTimeout(() => setSaving(null), 500)
  }

  const performSave = async (itemId: string, updates: Partial<ChecklistResposta>) => {
    setSaving(`cell-${itemId}`)
    const { data } = await supabase.from('checklist_respostas').upsert({
        item_id: itemId, turma_id: GLOBAL_TURMA_ID, ...updates,
        respondido_por: usuarioId, updated_at: new Date().toISOString()
    }, { onConflict: 'item_id,turma_id' }).select().single()
    if (data) setRespostas(prev => prev.map(r => (r.item_id === itemId) ? data : r))
    setTimeout(() => setSaving(null), 300)
  }

  const exportToExcel = () => {
    const html = `<html><head><meta charset="UTF-8"></head><body><table>
      <tr><th colspan="7">${customTitle}</th></tr>
      ${itens.map(i => `<tr><td>${i.item_n}</td><td>${i.contexto}</td><td>${i.responsavel}</td><td>${i.titulo}</td><td>${i.descricao}</td><td>${turmaRespostasMap[i.id]?.valor_data || ''}</td><td>${turmaRespostasMap[i.id]?.valor_texto || ''}</td></tr>`).join('')}
    </table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${customTitle}.xls`; link.click()
  }

  const processImport = async () => {
    if (!importFile) return
    setIsImporting(true)
    const text = await importFile.text()
    const rows = text.split('\n').filter(l => l.trim())
    const newItems = rows.map((r, idx) => {
      const cols = r.split(';')
      return { item_n: parseInt(cols[0]) || idx+1, titulo: cols[1] || 'ETAPA', responsavel: 'ADM', contexto: 'HOJE', tipo_campo: 'check', ordem: idx }
    })
    if (importReplace) await supabase.from('checklist_itens').delete().neq('id', '0')
    const { data } = await supabase.from('checklist_itens').insert(newItems).select()
    if (data) setItens(data)
    setIsImporting(false); setIsImportModalOpen(false)
  }

  return (
    <div className="checklist-v8-clean">
      {/* HEADER */}
      <div className="h-v8 glass">
        <div className="h-v8-left">
           <div className="h-v8-badge"><DatabaseZap size={22} /></div>
           <div className="h-v8-info">
              <input className="h-v8-title" value={customTitle} onChange={e => setCustomTitle(e.target.value)} onBlur={e => saveHeader('nome', e.target.value)} />
              <input className="h-v8-sub" value={customSub} onChange={e => setCustomSub(e.target.value)} onBlur={e => saveHeader('descricao', e.target.value)} />
           </div>
        </div>
        <div className="h-v8-right" style={{ display: 'flex', gap: '10px' }}>
           {isAdmin && <button className="btn-v8 silver" onClick={() => setIsImportModalOpen(true)}><FileUp size={16}/> IMPORTAR</button>}
           <button className="btn-v8 primary" onClick={exportToExcel}><FileSpreadsheet size={16}/> EXPORTAR EXCEL</button>
        </div>
      </div>

      <div className="list-v8 glass animation-fade">
         <table className="t-v8">
            <thead>
              <tr>
                 <th>#</th>
                 <th>PRAZO</th>
                 <th>RESPONSÁVEL</th>
                 <th>ETAPA DO PROCESSO</th>
                 <th>DESCRIÇÃO/LINKS</th>
                 <th>DATA</th>
                 <th>SITUAÇÃO</th>
              </tr>
            </thead>
            <tbody>
               {itens.sort((a,b) => (a.ordem ?? 0) - (b.ordem ?? 0)).map(item => {
                  const resp = turmaRespostasMap[item.id]
                  return (
                     <tr key={item.id}>
                        <td className="center"><span className="n-pill">{item.item_n}</span></td>
                        <td className="bold">{item.contexto}</td>
                        <td className="blue-txt">{item.responsavel}</td>
                        <td className="bold">
                           <div className="row-between" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                              {item.titulo}
                              {isAdmin && <button className="edit-btn" onClick={() => setEditingItem(item)} style={{background:'none', border:'none', color:'#4f7cff', cursor:'pointer', opacity:0.5}}><Edit3 size={12}/></button>}
                           </div>
                        </td>
                        <td className="dim">{renderFormattedText(item.descricao)}</td>
                        <td><input type="date" className="inp-v8" value={resp?.valor_data || ''} onChange={e => performSave(item.id, { valor_data: e.target.value })} /></td>
                        <td>
                           <div className="p-rel">
                              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                <input className="inp-v8 status-inp" value={resp?.valor_texto || ''} onChange={e => performSave(item.id, { valor_texto: e.target.value.toUpperCase() })} />
                                {resp?.valor_texto && resp.valor_texto.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/g) && (
                                  <a href={resp.valor_texto.startsWith('http') ? resp.valor_texto : `https://${resp.valor_texto}`} target="_blank" rel="noreferrer" style={{ marginLeft: '-30px', color: '#4f7cff', zIndex: 5 }}>
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </div>
                              {saving === `cell-${item.id}` && <div className="loader-mini"><Loader2 size={10} className="spin"/></div>}
                           </div>
                        </td>
                     </tr>
                  )
               })}
            </tbody>
         </table>
      </div>

      {/* MODAL EDIÇÃO */}
      {editingItem && (
        <div className="overlay-v8" onClick={() => setEditingItem(null)}>
           <div className="modal-v8 glass" onClick={e => e.stopPropagation()}>
              <div className="m-h">
                 <h3>EDITAR ETAPA #{editingItem.item_n}</h3>
                 <button onClick={() => setEditingItem(null)} style={{background:'none', border:'none', color:'#fff', cursor:'pointer'}}><X/></button>
              </div>
              <div className="m-b" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                       <label style={{ fontSize: '10px', fontWeight: '800', color: '#666' }}>Nº ORDEM</label>
                       <input className="inp-v8" type="number" value={editingItem.item_n} onChange={e => setEditingItem({...editingItem, item_n: parseInt(e.target.value)})} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                       <label style={{ fontSize: '10px', fontWeight: '800', color: '#666' }}>PRAZO / META</label>
                       <input className="inp-v8" value={editingItem.contexto || ''} onChange={e => setEditingItem({...editingItem, contexto: e.target.value.toUpperCase()})} placeholder="EX: D-10" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                       <label style={{ fontSize: '10px', fontWeight: '800', color: '#666' }}>RESPONSÁVEL</label>
                       <input className="inp-v8" value={editingItem.responsavel || ''} onChange={e => setEditingItem({...editingItem, responsavel: e.target.value.toUpperCase()})} placeholder="QUEM FAZ?" />
                    </div>
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#666' }}>TÍTULO DA ETAPA</label>
                    <input className="inp-v8" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value.toUpperCase()})} placeholder="NOME DA TAREFA" />
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#666' }}>DESCRIÇÃO DETALHADA / LINKS</label>
                    <textarea className="inp-v8" rows={6} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} placeholder="DETALHE O PROCESSO OU COLE LINKS AQUI" />
                 </div>
              </div>
              <div className="m-f">
                 <button className="btn-v8 primary" onClick={async () => {
                    await supabase.from('checklist_itens').update({
                      item_n: editingItem.item_n,
                      titulo: editingItem.titulo,
                      contexto: editingItem.contexto,
                      responsavel: editingItem.responsavel,
                      descricao: editingItem.descricao
                    }).eq('id', editingItem.id)
                    setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i)); setEditingItem(null)
                 }}><Save size={16}/> SALVAR MUDANÇAS NO ITEM</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL IMPORTAÇÃO */}
      {isImportModalOpen && (
        <div className="overlay-v8" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-v8 glass" onClick={e => e.stopPropagation()} style={{maxWidth: '450px'}}>
            <div className="m-h"><h3>IMPORTAR CHECKLIST (CSV)</h3><button onClick={() => setIsImportModalOpen(false)} style={{background:'none', border:'none', color:'#fff', cursor:'pointer'}}><X/></button></div>
            <div className="m-b">
               <p style={{fontSize: '12px', color: '#888'}}>O ARQUIVO DEVE SER CSV (DELIMITADO POR ";").</p>
               <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)} />
               <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer'}}>
                  <input type="checkbox" checked={importReplace} onChange={e => setImportReplace(e.target.checked)} />
                  SUBSTITUIR TODO O CHECKLIST ATUAL
               </label>
            </div>
            <div className="m-f">
               <button className="btn-v8 primary" disabled={isImporting || !importFile} onClick={processImport}>
                  {isImporting ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} />} 
                  {isImporting ? 'IMPORTANDO...' : 'INICIAR IMPORTAÇÃO'}
               </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .checklist-v8-clean { display: flex; flex-direction: column; gap: 20px; color: #fff; text-transform: uppercase; padding-bottom: 50px; }
        .glass { background: rgba(10, 10, 18, 0.98); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; }
        
        .h-v8 { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
        .h-v8-left { display: flex; align-items: center; gap: 15px; }
        .h-v8-badge { width: 45px; height: 45px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .h-v8-title { background: transparent; border: none; font-size: 20px; font-weight: 900; color: #fff; width: 400px; outline: none; text-transform: uppercase; }
        .h-v8-sub { background: transparent; border: none; font-size: 11px; color: #666; font-weight: 700; width: 100%; outline: none; margin-top: 2px; }

        .t-v8 { width: 100%; border-collapse: collapse; min-width: 1400px; }
        .t-v8 th { background: #080811; padding: 16px; font-size: 10px; color: #666; font-weight: 900; text-align: left; position: sticky; top: 0; z-index: 10; border-bottom: 2px solid #222; }
        .t-v8 td { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; vertical-align: top; }
        .n-pill { background: rgba(255,255,255,0.05); padding: 5px 12px; border-radius: 8px; color: #4f7cff; font-weight: 900; }
        .bold { font-weight: 800; } .blue-txt { color: #4f7cff; font-weight: 700; } .dim { color: #888; font-size: 12px; line-height: 1.6; }
        .inp-v8 { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 10px; color: #fff; width: 100%; outline: none; font-size: 13px; }
        .status-inp { color: #10d98c; font-weight: 800; border-color: rgba(16,217,140,0.1); }
        .loader-mini { position: absolute; top: -8px; right: -8px; background: #4f7cff; border-radius: 50%; padding: 4px; }
        .p-rel { position: relative; width: 220px; }

        .btn-v8 { display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 12px; font-size: 12px; font-weight: 800; cursor: pointer; border: none; transition: 0.2s; }
        .btn-v8.primary { background: #4f7cff; color: #fff; }
        .btn-v8.silver { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); }
        
        .overlay-v8 { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .modal-v8 { width: 650px; } .m-h { padding: 24px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; } .m-b { padding: 24px; display: flex; flex-direction: column; gap: 15px; } .m-f { padding: 20px 24px; display: flex; justify-content: flex-end; }
        
        .animation-fade { animation: fadeIn 0.4s ease; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
