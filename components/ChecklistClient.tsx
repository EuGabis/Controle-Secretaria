'use client'

// v9.0 - CHECKLIST ULTIMATE (SHIFT / LINKS / CRUD / DASHBOARD) 📊
// TUDO FUNCIONANDO E SINCRONIZADO

import { useState, useMemo, useEffect } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Edit3, Save, Loader2, X, DatabaseZap,
  UploadCloud, FileUp, FileSpreadsheet, 
  ExternalLink
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
        return (
          <a key={i} href={url} target="_blank" rel="noreferrer" style={{color: '#4f7cff', textDecoration: 'underline', fontWeight: '800'}}>
            {part} <ExternalLink size={10} style={{display:'inline'}}/>
          </a>
        )
      }
      return part
    })
  }

  // --- PERSISTÊNCIA ---
  const saveHeader = async (field: 'nome' | 'descricao', value: string) => {
    setSaving('header'); 
    const update: any = { id: GLOBAL_TURMA_ID }; 
    update[field] = value.toUpperCase()
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
    <div className="checklist-v9">
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
                 <th>DESCRIÇÃO / LINKS</th>
                 <th>DATA</th>
                 <th>SITUAÇÃO</th>
              </tr>
            </thead>
            <tbody>
               {itens.sort((a,b) => (a.item_n ?? 0) - (b.item_n ?? 0)).map(item => {
                  const resp = turmaRespostasMap[item.id]
                  return (
                     <tr key={item.id}>
                        <td className="center"><span className="n-pill">{item.item_n}</span></td>
                        <td className="bold">{item.contexto}</td>
                        <td className="blue-txt">{item.responsavel}</td>
                        <td className="bold">
                           <div className="row-between" style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap: '8px'}}>
                              {item.titulo}
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {isAdmin && (
                                  <>
                                    <button className="edit-btn" onClick={() => setEditingItem(item)} style={{background:'none', border:'none', color:'#4f7cff', cursor:'pointer', opacity:0.6}}><Edit3 size={14}/></button>
                                    <button className="del-btn" onClick={async () => {
                                      if (confirm(`DESEJA REALMENTE EXCLUIR A ETAPA #${item.item_n}?`)) {
                                        await supabase.from('checklist_itens').delete().eq('id', item.id)
                                        setItens(prev => prev.filter(i => i.id !== item.id))
                                      }
                                    }} style={{background:'none', border:'none', color:'#ff4d6a', cursor:'pointer', opacity:0.6}}><Trash2 size={14}/></button>
                                  </>
                                )}
                              </div>
                           </div>
                        </td>
                        <td className="dim">{renderFormattedText(item.descricao)}</td>
                        <td><input type="date" className="inp-v8" value={resp?.valor_data || ''} onChange={e => performSave(item.id, { valor_data: e.target.value })} /></td>
                        <td>
                           <div className="p-rel">
                              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '5px' }}>
                                <input className="inp-v8 status-inp" value={resp?.valor_texto || ''} onChange={e => performSave(item.id, { valor_texto: e.target.value.toUpperCase() })} />
                                {resp?.valor_texto && resp.valor_texto.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/g) && (
                                  <a href={resp.valor_texto.startsWith('http') ? resp.valor_texto : `https://${resp.valor_texto}`} target="_blank" rel="noreferrer" style={{ color: '#4f7cff' }}>
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

         {isAdmin && (
           <div className="footer-v8">
             <button className="add-v8" onClick={async () => {
                const maxN = Math.max(0, ...itens.map(i => i.item_n ?? 0))
                const { data } = await supabase.from('checklist_itens').insert({
                  item_n: maxN + 1,
                  titulo: 'NOVA ETAPA',
                  contexto: 'D-X',
                  responsavel: 'ADM',
                  ordem: maxN + 1,
                  tipo_campo: 'check'
                }).select().single()
                if (data) setItens(prev => [...prev, data].sort((a,b) => a.item_n - b.item_n))
             }}>
                <Plus size={18} /> ADICIONAR NOVA ETAPA NO FINAL
             </button>
           </div>
         )}
      </div>

      {/* MODAL EDIÇÃO COMPLETA */}
      {editingItem && (
        <div className="overlay-v8" onClick={() => setEditingItem(null)}>
           <div className="modal-v8 glass scale-in" onClick={e => e.stopPropagation()}>
              <div className="m-h">
                 <h3>EDITAR ETAPA #{editingItem.item_n}</h3>
                 <button onClick={() => setEditingItem(null)} className="close-x"><X/></button>
              </div>
              <div className="m-b">
                 <div className="grid-3">
                    <div className="f-group">
                       <label>Nº ORDEM / ID</label>
                       <input className="inp-v8" type="number" value={editingItem.item_n} onChange={e => setEditingItem({...editingItem, item_n: parseInt(e.target.value)})} />
                    </div>
                    <div className="f-group">
                       <label>PRAZO / META</label>
                       <input className="inp-v8" value={editingItem.contexto || ''} onChange={e => setEditingItem({...editingItem, contexto: e.target.value.toUpperCase()})} placeholder="EX: D-10" />
                    </div>
                    <div className="f-group">
                       <label>RESPONSÁVEL</label>
                       <input className="inp-v8" value={editingItem.responsavel || ''} onChange={e => setEditingItem({...editingItem, responsavel: e.target.value.toUpperCase()})} placeholder="QUEM FAZ?" />
                    </div>
                 </div>

                 <div className="f-group">
                    <label>TÍTULO DA ETAPA DO PROCESSO</label>
                    <input className="inp-v8 main-title-inp" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value.toUpperCase()})} placeholder="NOME DA TAREFA" />
                 </div>

                 <div className="f-group">
                    <label>DESCRIÇÃO DETALHADA E LINKS</label>
                    <textarea className="inp-v8 desc-area" rows={6} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} placeholder="DETALHE O PROCESSO OU COLE LINKS AQUI" />
                 </div>
              </div>
              <div className="m-f">
                 <button className="btn-v8 primary" onClick={async () => {
                    setSaving('modal-save')
                    const targetN = editingItem.item_n
                    const oldItem = itens.find(i => i.id === editingItem.id)
                    
                    if (oldItem?.item_n !== targetN) {
                       const toShift = itens.filter(i => i.item_n >= targetN && i.id !== editingItem.id)
                       if (toShift.length > 0) {
                          const shiftUpdates = toShift.map(i => ({ ...i, item_n: (i.item_n || 0) + 1, ordem: (i.ordem || 0) + 1 }))
                          await supabase.from('checklist_itens').upsert(shiftUpdates)
                       }
                    }

                    const { data, error } = await supabase.from('checklist_itens').update({
                      item_n: editingItem.item_n,
                      titulo: editingItem.titulo,
                      contexto: editingItem.contexto,
                      responsavel: editingItem.responsavel,
                      descricao: editingItem.descricao,
                      ordem: editingItem.item_n
                    }).eq('id', editingItem.id).select().single()

                    if (!error && data) {
                       const { data: allItens } = await supabase.from('checklist_itens').select('*').order('item_n', { ascending: true })
                       if (allItens) setItens(allItens)
                       setEditingItem(null)
                    }
                    setSaving(null)
                 }}>
                    {saving === 'modal-save' ? <><Loader2 size={16} className="spin"/> SALVANDO E REORDENANDO...</> : <><Save size={16}/> SALVAR MUDANÇAS</>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL IMPORTAÇÃO */}
      {isImportModalOpen && (
        <div className="overlay-v8" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-v8 glass scale-in" onClick={e => e.stopPropagation()} style={{maxWidth: '450px'}}>
            <div className="m-h"><h3>IMPORTAR CHECKLIST (CSV)</h3><button onClick={() => setIsImportModalOpen(false)} className="close-x"><X/></button></div>
            <div className="m-b">
               <p style={{fontSize: '11px', color: '#666', marginBottom: '10px'}}>ARQUIVO CSV DELIMITADO POR ";".</p>
               <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)} className="inp-v8" style={{padding: '20px'}} />
               <label className="check-label">
                  <input type="checkbox" checked={importReplace} onChange={e => setImportReplace(e.target.checked)} />
                  SUBSTITUIR TODO O CHECKLIST ATUAL
               </label>
            </div>
            <div className="m-f">
               <button className="btn-v8 silver" disabled={isImporting || !importFile} onClick={processImport}>
                  {isImporting ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} />} 
                  {isImporting ? 'PROCESSANDO...' : 'INICIAR IMPORTAÇÃO'}
               </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .checklist-v9 { display: flex; flex-direction: column; gap: 20px; color: #fff; text-transform: uppercase; padding-bottom: 80px; }
        .glass { background: rgba(10, 10, 18, 0.95); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        
        .h-v8 { padding: 25px; display: flex; justify-content: space-between; align-items: center; }
        .h-v8-left { display: flex; align-items: center; gap: 18px; }
        .h-v8-badge { width: 50px; height: 50px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(79, 124, 255, 0.3); }
        .h-v8-title { background: transparent; border: none; font-size: 22px; font-weight: 900; color: #fff; width: 450px; outline: none; text-transform: uppercase; letter-spacing: -0.02em; }
        .h-v8-sub { background: transparent; border: none; font-size: 11px; color: #666; font-weight: 700; width: 100%; outline: none; margin-top: 4px; letter-spacing: 0.05em; }

        .t-v8 { width: 100%; border-collapse: collapse; min-width: 1500px; }
        .t-v8 th { background: #050508; padding: 20px 16px; font-size: 10px; color: #555; font-weight: 900; text-align: left; position: sticky; top: 0; z-index: 10; border-bottom: 2px solid #1a1a24; }
        .t-v8 td { padding: 18px 16px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 13px; vertical-align: middle; transition: 0.2s; }
        .t-v8 tr:hover td { background: rgba(255,255,255,0.01); }
        
        .n-pill { background: rgba(79, 124, 255, 0.1); border: 1px solid rgba(79, 124, 255, 0.2); padding: 6px 14px; border-radius: 10px; color: #4f7cff; font-weight: 900; font-size: 14px; }
        .bold { font-weight: 800; } .blue-txt { color: #4f7cff; font-weight: 700; } .dim { color: #888; font-size: 12px; line-height: 1.6; max-width: 400px; }
        .inp-v8 { background: rgba(20, 20, 35, 0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; color: #fff; width: 100%; outline: none; font-size: 13px; transition: all 0.2s; }
        .inp-v8:focus { border-color: #4f7cff; background: rgba(79, 124, 255, 0.05); }
        .status-inp { color: #10d98c; font-weight: 800; border-color: rgba(16,217,140,0.15); }
        .loader-mini { position: absolute; top: -10px; right: -10px; background: #4f7cff; border-radius: 50%; padding: 5px; box-shadow: 0 0 15px rgba(79, 124, 255, 0.5); }
        .p-rel { position: relative; width: 240px; }

        .btn-v8 { display: flex; align-items: center; gap: 10px; padding: 14px 24px; border-radius: 15px; font-size: 12px; font-weight: 800; cursor: pointer; border: none; transition: 0.3s; text-transform: uppercase; }
        .btn-v8.primary { background: linear-gradient(135deg, #4f7cff, #8b5cf6); color: #fff; box-shadow: 0 10px 25px rgba(79, 124, 255, 0.2); }
        .btn-v8.primary:hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(79, 124, 255, 0.3); }
        .btn-v8.silver { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); }
        .btn-v8.silver:hover { background: rgba(255,255,255,0.1); }

        .footer-v8 { padding: 40px; display: flex; justify-content: center; }
        .add-v8 { background: rgba(255,255,255,0.02); border: 2px dashed rgba(255,255,255,0.1); color: #555; padding: 25px 50px; border-radius: 20px; font-weight: 900; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 12px; font-size: 14px; }
        .add-v8:hover { border-color: #4f7cff; color: #4f7cff; background: rgba(79, 124, 255, 0.05); transform: scale(1.02); }
        
        .overlay-v8 { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(15px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-v8 { width: 100%; max-width: 750px; } 
        .m-h { padding: 30px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; } 
        .m-b { padding: 30px; display: flex; flex-direction: column; gap: 20px; } 
        .m-f { padding: 25px 30px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: flex-end; }
        
        .grid-3 { display: grid; grid-template-columns: 120px 1fr 1fr; gap: 15px; }
        .f-group { display: flex; flexDirection: column; gap: 8px; }
        .f-group label { font-size: 10px; font-weight: 900; color: #555; letter-spacing: 0.05em; }
        .main-title-inp { font-size: 16px; font-weight: 800; border-color: rgba(79, 124, 255, 0.3); }
        .close-x { background: none; border: none; color: #fff; cursor: pointer; padding: 5px; opacity: 0.5; transition: 0.2s; }
        .close-x:hover { opacity: 1; transform: rotate(90deg); }
        .check-label { display: flex; alignItems: center; gap: 10px; font-size: 12px; cursor: pointer; margin-top: 10px; font-weight: 700; color: #ff4d6a; }

        .scale-in { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animation-fade { animation: fadeIn 0.5s ease; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
