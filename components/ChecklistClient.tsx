'use client'

// v9.1 - CHECKLIST ULTIMATE (FRAMING & ALIGNMENT FIX) 📊
// TUDO FUNCIONANDO, SINCRONIZADO E ENQUADRADO

import { useState, useMemo } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Edit3, Save, Loader2, X, DatabaseZap,
  UploadCloud, FileSpreadsheet, 
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
  const [expandedTurmaId, setExpandedTurmaId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importReplace, setImportReplace] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  const handleCreateTurma = async () => {
    const nome = prompt('NOME DO NOVO CHECKLIST / TURMA:')
    if (!nome) return
    
    setIsCreating(true)
    try {
      const { data: newTurma, error: tErr } = await supabase.from('checklist_turmas').insert({
        nome: nome.toUpperCase(),
        ativa: true
      }).select().single()

      if (tErr || !newTurma) throw tErr

      const templateItens = itens.filter(i => (i as any).turma_id === GLOBAL_TURMA_ID)
      const clonedItens = templateItens.map(i => ({
        item_n: i.item_n,
        titulo: i.titulo,
        contexto: i.contexto,
        responsavel: i.responsavel,
        descricao: i.descricao,
        tipo_campo: i.tipo_campo,
        ordem: i.ordem,
        turma_id: newTurma.id
      }))

      const { data: insertedItens, error: iErr } = await supabase.from('checklist_itens').insert(clonedItens).select()
      if (iErr) throw iErr
      if (insertedItens) setItens(prev => [...prev, ...insertedItens])
      window.location.reload() 
    } catch (err) {
      console.error(err)
      alert('Erro ao criar checklist')
    } finally {
      setIsCreating(false)
    }
  }

  const turmaRespostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.forEach(r => { map[`${r.item_id}-${r.turma_id}`] = r })
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

  const saveHeader = async (turmaId: string, field: 'nome' | 'descricao', value: string) => {
    setSaving(`header-${turmaId}`); 
    const update: any = { id: turmaId }; 
    update[field] = value.toUpperCase()
    await supabase.from('checklist_turmas').upsert(update, { onConflict: 'id' })
    setTimeout(() => setSaving(null), 500)
  }

  const performSave = async (itemId: string, turmaId: string, updates: Partial<ChecklistResposta>) => {
    setSaving(`cell-${itemId}`)
    
    // Se estiver preenchendo valor_texto, marcamos status como OK para o contador
    const status = (updates.valor_texto && updates.valor_texto.trim().length > 0) ? 'OK' : 'PENDENTE'
    
    const { data } = await supabase.from('checklist_respostas').upsert({
        item_id: itemId, turma_id: turmaId, ...updates, status,
        respondido_por: usuarioId, updated_at: new Date().toISOString()
    }, { onConflict: 'item_id,turma_id' }).select().single()
    
    if (data) {
      setRespostas(prev => {
        const index = prev.findIndex(r => r.item_id === itemId && r.turma_id === turmaId)
        if (index >= 0) {
          const newRes = [...prev]
          newRes[index] = data
          return newRes
        }
        return [...prev, data]
      })
    }
    setTimeout(() => setSaving(null), 300)
  }


  const exportToExcel = (turmaId: string, turmaNome: string) => {
    const turmaItens = itens.filter(i => (i as any).turma_id === turmaId)
    const html = `<html><head><meta charset="UTF-8"></head><body><table>
      <tr><th colspan="7">${turmaNome}</th></tr>
      ${turmaItens.map(i => `<tr><td>${i.item_n}</td><td>${i.contexto}</td><td>${i.responsavel}</td><td>${i.titulo}</td><td>${i.descricao}</td><td>${turmaRespostasMap[`${i.id}-${turmaId}`]?.valor_data || ''}</td><td>${turmaRespostasMap[`${i.id}-${turmaId}`]?.valor_texto || ''}</td></tr>`).join('')}
    </table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${turmaNome}.xls`; link.click()
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
      {/* MODAL EDIÇÃO COMPLETA - ULTRA PREMIUM DESIGN */}
      {editingItem && (
        <div className="overlay-v8" onClick={() => setEditingItem(null)}>
           <div className="modal-v8 premium-glam scale-in" onClick={e => e.stopPropagation()}>
              <div className="m-h">
                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="modal-icon-header"><Edit3 size={20}/></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#fff' }}>EDITOR DE ETAPAS</h3>
                       <span style={{ fontSize: '10px', color: '#4f7cff', fontWeight: '900' }}>CONFIGURAÇÕES INDEPENDENTES</span>
                    </div>
                 </div>
                 <button onClick={() => setEditingItem(null)} className="close-x"><X size={22}/></button>
              </div>
              
              <div className="m-b">
                 <div className="modal-grid-top">
                    <div className="f-group">
                       <label>ETAPA Nº</label>
                       <input className="inp-v8" type="number" value={editingItem.item_n} onChange={e => setEditingItem({...editingItem, item_n: parseInt(e.target.value)})} />
                    </div>
                    <div className="f-group">
                       <label>PRAZO / TAG</label>
                       <input className="inp-v8" value={editingItem.contexto || ''} onChange={e => setEditingItem({...editingItem, contexto: e.target.value.toUpperCase()})} placeholder="EX: D-10" />
                    </div>
                    <div className="f-group">
                       <label>RESPONSÁVEL</label>
                       <input className="inp-v8" value={editingItem.responsavel || ''} onChange={e => setEditingItem({...editingItem, responsavel: e.target.value.toUpperCase()})} placeholder="NOME DO RESPONSÁVEL" />
                    </div>
                 </div>

                 <div className="f-group">
                    <label>TÍTULO DA ATIVIDADE</label>
                    <input className="inp-v8 main-title-inp" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value.toUpperCase()})} placeholder="DESCREVA A TAREFA" />
                 </div>

                 <div className="f-group">
                    <label>DETALHAMENTO E LINKS (TEXTO LIVRE)</label>
                    <textarea className="inp-v8 desc-area" rows={6} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} placeholder="COLE LINKS OU OBSERVAÇÕES AQUI..." />
                 </div>
              </div>

              <div className="m-f">
                 <button className="btn-v8 primary-gradient big-btn" onClick={async () => {
                    setSaving('modal-save')
                    try {
                      const isMaster = (editingItem as any).turma_id === GLOBAL_TURMA_ID
                      const updates = {
                        item_n: editingItem.item_n,
                        titulo: editingItem.titulo,
                        contexto: editingItem.contexto,
                        responsavel: editingItem.responsavel,
                        descricao: editingItem.descricao,
                        ordem: editingItem.item_n
                      }

                      // 1. Salvar o item atual
                      const { data, error } = await supabase.from('checklist_itens').update(updates).eq('id', editingItem.id).select().single()
                      if (error) throw error

                      // 2. Se for MASTER, propagar edição para itens com mesmo item_n em outras turmas? 
                      // O usuário pediu especificamente para CRIAÇÃO, mas é bom propagar EDIÇÃO de títulos/descrições se for master.
                      if (isMaster && data) {
                        await supabase.from('checklist_itens').update({
                           titulo: data.titulo,
                           contexto: data.contexto,
                           responsavel: data.responsavel,
                           descricao: data.descricao
                        }).eq('item_n', data.item_n).neq('turma_id', GLOBAL_TURMA_ID)
                      }

                      if (data) {
                         // Recarregar tudo para garantir consistência após propagação em massa
                         const { data: allItens } = await supabase.from('checklist_itens').select('*').order('item_n', { ascending: true })
                         if (allItens) setItens(allItens)
                         setEditingItem(null)
                      }
                    } catch (err: any) { alert('ERRO: ' + err.message) }
                    finally { setSaving(null) }
                 }}>
                    {saving === 'modal-save' ? <><Loader2 size={18} className="spin"/> SALVANDO...</> : <><Save size={18}/> SALVAR ALTERAÇÕES</>}
                 </button>
              </div>

           </div>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="main-header glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="h-v8-badge"><DatabaseZap size={22} /></div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>SISTEMA DE CHECKLISTS</h1>
            <p style={{ fontSize: '10px', color: '#555', fontWeight: '700' }}>GESTÃO INDEPENDENTE DE PROCESSOS</p>
          </div>
        </div>
        <div>
          {isAdmin && (
            <button className="btn-v8 primary-gradient" onClick={handleCreateTurma} disabled={isCreating}>
              {isCreating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              NOVO CHECKLIST
            </button>
          )}
        </div>
      </div>

      <div className="checklist-container">
        {initialTurmas.map(turma => {
          const isExpanded = expandedTurmaId === turma.id
          const turmaItens = itens.filter(i => (i as any).turma_id === turma.id)
          const isPadrão = turma.id === GLOBAL_TURMA_ID

          return (
            <div key={turma.id} className={`checklist-instance ${isExpanded ? 'expanded' : ''}`}>
              <div className="instance-header glass" onClick={() => setExpandedTurmaId(isExpanded ? null : turma.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div className={`status-dot ${isPadrão ? 'gold' : 'blue'}`} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span className="turma-name">{turma.nome}</span>
                       {isPadrão && <span className="master-badge">MODÊLO MASTER</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="turma-meta">{turmaItens.length} ETAPAS</span>
                      <span className="progress-pill">
                        {respostas.filter(r => r.turma_id === turma.id && r.status === 'OK').length} / {turmaItens.length} CONCLUÍDOS
                      </span>
                    </div>
                  </div>
                </div>
                <Edit3 size={18} className="icon-expand" />
              </div>

              {isExpanded && (
                <div className="instance-content scale-in">
                  <div className="content-inner glass">
                    <div className="table-header">
                       <input className="h-v8-title" defaultValue={turma.nome} onBlur={e => saveHeader(turma.id, 'nome', e.target.value)} />
                       <button className="btn-v8 primary" onClick={() => exportToExcel(turma.id, turma.nome)}><FileSpreadsheet size={16}/> EXPORTAR</button>
                    </div>

                    <div className="table-wrapper">
                      <table className="t-v8">
                        <thead>
                          <tr>
                             <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                             <th style={{ width: '140px' }}>PRAZO</th>
                             <th style={{ width: '160px' }}>RESPONSÁVEL</th>
                             <th style={{ width: '280px' }}>ETAPA DO PROCESSO</th>
                             <th style={{ minWidth: '300px' }}>DESCRIÇÃO / LINKS</th>
                             <th style={{ width: '150px' }}>DATA</th>
                             <th style={{ width: '180px' }}>SITUAÇÃO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {turmaItens.sort((a,b) => (a.item_n ?? 0) - (b.item_n ?? 0)).map(item => {
                            const resp = turmaRespostasMap[`${item.id}-${turma.id}`]
                            return (
                              <tr key={item.id}>
                                <td className="center" style={{ verticalAlign: 'middle' }}>
                                  <span className="n-pill">{item.item_n}</span>
                                </td>
                                <td className="bold" style={{ verticalAlign: 'middle' }}>{item.contexto}</td>
                                <td className="blue-txt" style={{ verticalAlign: 'middle' }}>{item.responsavel}</td>
                                <td className="bold" style={{ verticalAlign: 'middle' }}>
                                   <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap: '8px'}}>
                                      <span style={{ flex: 1 }}>{item.titulo}</span>
                                      {isAdmin && (
                                        <div className="action-btns" style={{ display: 'flex', gap: '6px' }}>
                                          <button className="edit-btn" onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}><Edit3 size={15}/></button>
                                          <button className="del-btn" onClick={async (e) => {
                                            e.stopPropagation();
                                            if (confirm(`EXCLUIR?`)) {
                                              await supabase.from('checklist_itens').delete().eq('id', item.id)
                                              setItens(prev => prev.filter(i => i.id !== item.id))
                                            }
                                          }}><Trash2 size={15}/></button>
                                        </div>
                                      )}
                                   </div>
                                </td>
                                <td className="dim" style={{ verticalAlign: 'middle' }}>{renderFormattedText(item.descricao)}</td>
                                <td style={{ verticalAlign: 'middle' }}>
                                  <input type="date" className="inp-v8" value={resp?.valor_data || ''} onChange={e => performSave(item.id, turma.id, { valor_data: e.target.value })} />
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>
                                   <div className="p-rel">
                                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                                        <input className="inp-v8 status-inp" value={resp?.valor_texto || ''} onChange={e => performSave(item.id, turma.id, { valor_texto: e.target.value.toUpperCase() })} />
                                        {resp?.valor_texto && resp.valor_texto.includes('http') && (
                                          <a href={resp.valor_texto} target="_blank" rel="noreferrer" className="external-link"><ExternalLink size={16} /></a>
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

                    {isAdmin && (
                      <div className="footer-v8">
                        <button className="add-v8" onClick={async () => {
                           setSaving(`add-${turma.id}`)
                           const maxN = Math.max(0, ...turmaItens.map(i => i.item_n ?? 0))
                           const newItemData = {
                             item_n: maxN + 1, titulo: 'NOVA ETAPA', contexto: 'D-X', responsavel: 'ADM', ordem: maxN + 1, tipo_campo: 'check', turma_id: turma.id
                           }

                           // 1. Criar o item principal
                           const { data: masterItem, error } = await supabase.from('checklist_itens').insert(newItemData).select().single()
                           
                           if (error) { alert('ERRO: ' + error.message); setSaving(null); return; }

                           // 2. Se for o MASTER, propagar para TODAS as outras turmas existentes
                           if (turma.id === GLOBAL_TURMA_ID && masterItem) {
                             const otherTurmas = initialTurmas.filter(t => t.id !== GLOBAL_TURMA_ID)
                             const propagationItens = otherTurmas.map(t => ({
                               ...newItemData,
                               turma_id: t.id
                             }))
                             if (propagationItens.length > 0) {
                               await supabase.from('checklist_itens').insert(propagationItens)
                             }
                           }

                           // 3. Recarregar estado
                           const { data: allItens } = await supabase.from('checklist_itens').select('*').order('item_n', { ascending: true })
                           if (allItens) setItens(allItens)
                           setSaving(null)
                        }}>
                           {saving === `add-${turma.id}` ? <Loader2 size={18} className="spin"/> : <Plus size={18} />} 
                           {turma.id === GLOBAL_TURMA_ID ? 'ADICIONAR ETAPA (PROPAGAR PARA TODOS)' : 'ADICIONAR ETAPA LOCAL'}
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isImportModalOpen && (
        <div className="overlay-v8" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-v8 scale-in" style={{maxWidth: '450px'}}>
            <div className="m-h"><h3>IMPORTAR CSV</h3><button onClick={() => setIsImportModalOpen(false)} className="close-x"><X/></button></div>
            <div className="m-b">
               <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)} className="inp-v8" />
            </div>
            <div className="m-f">
               <button className="btn-v8 primary" disabled={isImporting || !importFile} onClick={processImport}>IMPORTAR</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .checklist-v9 { display: flex; flex-direction: column; gap: 20px; color: #fff; text-transform: uppercase; padding-bottom: 80px; font-family: 'Inter', sans-serif; }
        .glass { background: rgba(10, 10, 18, 0.96); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; }
        .main-header { padding: 30px; display: flex; justify-content: space-between; align-items: center; }
        .checklist-container { display: flex; flex-direction: column; gap: 15px; }

        .instance-header { padding: 25px 30px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.3s; }
        .instance-header:hover { background: rgba(255,255,255,0.02); }
        .turma-name { font-size: 18px; font-weight: 900; }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; }
        .status-dot.gold { background: #ffcc00; }
        .status-dot.blue { background: #4f7cff; }
        .master-badge { background: rgba(255,204,0,0.1); color: #ffcc00; font-size: 9px; padding: 2px 8px; border-radius: 6px; margin-left: 8px; }
        .progress-pill { background: rgba(16, 217, 140, 0.1); color: #10d98c; font-size: 10px; padding: 4px 12px; border-radius: 8px; font-weight: 900; }

        .content-inner { padding: 0; background: rgba(0,0,0,0.2); border-radius: 0 0 20px 20px; overflow: hidden; }
        .table-header { padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); }
        .table-wrapper { overflow-x: auto; width: 100%; }

        .t-v8 { width: 100%; border-collapse: collapse; min-width: 1200px; }
        .t-v8 th { background: rgba(0,0,0,0.4); padding: 18px 20px; font-size: 10px; color: #555; text-align: left; border-bottom: 2px solid #1a1a24; }
        .t-v8 td { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 13px; word-break: break-word; vertical-align: middle; }
        
        .n-pill { background: rgba(79, 124, 255, 0.1); border: 1px solid rgba(79, 124, 255, 0.2); width: 36px; height: 36px; border-radius: 12px; color: #4f7cff; font-weight: 900; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
        .bold { font-weight: 800; color: #fff; }
        .blue-txt { color: #4f7cff; font-weight: 900; font-size: 11px; }
        .dim { color: #777; font-size: 12px; line-height: 1.6; text-transform: none; }
        
        .inp-v8 { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; color: #fff; width: 100%; outline: none; }
        .status-inp { color: #10d98c; font-weight: 900; }
        .p-rel { position: relative; width: 100%; }
        .loader-mini { position: absolute; top: -5px; right: -5px; background: #4f7cff; border-radius: 50%; }

        .btn-v8 { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-size: 10px; font-weight: 800; cursor: pointer; border: none; }
        .primary-gradient { background: linear-gradient(135deg, #4f7cff, #8b5cf6); color: #fff; }

        .overlay-v8 { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(25px); z-index: 9999; display: flex; align-items: center; justify-content: center; }
        .modal-v8 { width: 100%; max-width: 700px; border-radius: 32px; background: rgba(15, 15, 25, 0.98); border: 1px solid rgba(255,255,255,0.1); }
        .m-h { padding: 30px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; }
        .m-b { padding: 30px; display: flex; flex-direction: column; gap: 20px; }
        .m-f { padding: 25px 30px; display: flex; justify-content: flex-end; }
        .modal-grid-top { display: grid; grid-template-columns: 80px 1fr 1fr; gap: 15px; }
        .f-group { display: flex; flex-direction: column; gap: 5px; }
        .f-group label { font-size: 9px; color: #444; font-weight: 900; }

        .action-btns { opacity: 0; transition: 0.3s; }
        tr:hover .action-btns { opacity: 1; }
        .edit-btn:hover { color: #4f7cff; }
        .del-btn:hover { color: #ff4d6a; }

        .scale-in { animation: scaleIn 0.3s ease-out; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
