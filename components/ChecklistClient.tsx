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
  const [itens, setItens] = useState(initialItens) // Todos os itens de todas as turmas carregados
  const [respostas, setRespostas] = useState(initialRespostas)
  const [expandedTurmaId, setExpandedTurmaId] = useState<string | null>(null) // Acordeão: tudo fechado por padrão
  const [saving, setSaving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importReplace, setImportReplace] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  // --- LÓGICA DE INSTÂNCIAS ---
  const handleCreateTurma = async () => {
    const nome = prompt('NOME DO NOVO CHECKLIST / TURMA:')
    if (!nome) return
    
    setIsCreating(true)
    try {
      // 1. Criar a nova Turma
      const { data: newTurma, error: tErr } = await supabase.from('checklist_turmas').insert({
        nome: nome.toUpperCase(),
        ativa: true
      }).select().single()

      if (tErr || !newTurma) throw tErr

      // 2. Clonar Itens do Modelo Padrão (GLOBAL_TURMA_ID)
      const templateItens = itens.filter(i => (i as any).turma_id === GLOBAL_TURMA_ID)
      const clonedItens = templateItens.map(i => ({
        item_n: i.item_n,
        titulo: i.titulo,
        contexto: i.contexto,
        responsavel: i.responsavel,
        descricao: i.descricao,
        tipo_campo: i.tipo_campo,
        ordem: i.ordem,
        turma_id: newTurma.id // Associa à nova turma
      }))

      const { data: insertedItens, error: iErr } = await supabase.from('checklist_itens').insert(clonedItens).select()
      
      if (iErr) throw iErr

      // 3. Atualizar Estado Local
      if (insertedItens) setItens(prev => [...prev, ...insertedItens])
      // Forçar atualização da página para carregar a nova turma na lista se necessário, 
      // ou apenas atualizar o estado turmas se tivéssemos ele em um state. 
      // Como initialTurmas vem por prop, o ideal é usar router.refresh() ou recarregar.
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

  // --- PERSISTÊNCIA ---
  const saveHeader = async (turmaId: string, field: 'nome' | 'descricao', value: string) => {
    setSaving(`header-${turmaId}`); 
    const update: any = { id: turmaId }; 
    update[field] = value.toUpperCase()
    await supabase.from('checklist_turmas').upsert(update, { onConflict: 'id' })
    setTimeout(() => setSaving(null), 500)
  }

  const performSave = async (itemId: string, turmaId: string, updates: Partial<ChecklistResposta>) => {
    setSaving(`cell-${itemId}`)
    const { data } = await supabase.from('checklist_respostas').upsert({
        item_id: itemId, turma_id: turmaId, ...updates,
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
                       <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em' }}>EDITOR DE ETAPAS</h3>
                       <span style={{ fontSize: '10px', color: '#4f7cff', fontWeight: '900', letterSpacing: '0.1em' }}>CONFIGURAÇÕES INDEPENDENTES</span>
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
                    <textarea className="inp-v8 desc-area" rows={6} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} placeholder="COLE LINKS, INSTRUÇÕES OU OBSERVAÇÕES AQUI..." />
                 </div>
              </div>

              <div className="m-f">
                 <div style={{ marginRight: 'auto', fontSize: '10px', color: '#444', fontWeight: '800' }}>
                    ID: {editingItem.id.split('-')[0]}...
                 </div>
                 <button className="btn-v8 primary-gradient big-btn" onClick={async () => {
                    setSaving('modal-save')
                    try {
                      const { data, error } = await supabase.from('checklist_itens').update({
                        item_n: editingItem.item_n,
                        titulo: editingItem.titulo,
                        contexto: editingItem.contexto,
                        responsavel: editingItem.responsavel,
                        descricao: editingItem.descricao,
                        ordem: editingItem.item_n
                      }).eq('id', editingItem.id).select().single()

                      if (error) throw error
                      if (data) {
                         setItens(prev => prev.map(i => i.id === data.id ? data : i))
                         setEditingItem(null)
                      }
                    } catch (err: any) {
                      alert('ERRO AO SALVAR: ' + err.message)
                    } finally {
                      setSaving(null)
                    }
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
            <h1 className="text-gradient" style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>SISTEMA DE CHECKLISTS</h1>
            <p style={{ fontSize: '10px', color: '#555', fontWeight: '700', letterSpacing: '0.1em' }}>GESTÃO INDEPENDENTE DE PROCESSOS</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
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
              {/* ACCORDION HEADER */}
              <div className="instance-header glass" onClick={() => setExpandedTurmaId(isExpanded ? null : turma.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div className={`status-dot ${isPadrão ? 'gold' : 'blue'}`} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span className="turma-name">{turma.nome}</span>
                       {isPadrão && <span className="master-badge">MODÊLO MASTER</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="turma-meta">{turmaItens.length} ETAPAS CONFIGURADAS</span>
                      <span className="progress-pill">
                        {respostas.filter(r => r.turma_id === turma.id && r.status === 'OK').length} / {turmaItens.length} CONCLUÍDOS
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {saving === `header-${turma.id}` && <Loader2 size={14} className="spin" style={{color: '#4f7cff'}}/>}
                  <Edit3 size={18} className="icon-expand" />
                </div>
              </div>

              {/* ACCORDION CONTENT */}
              {isExpanded && (
                <div className="instance-content scale-in">
                  <div className="content-inner glass">
                    <div className="table-header">
                       <input 
                         className="h-v8-title" 
                         defaultValue={turma.nome} 
                         onBlur={e => saveHeader(turma.id, 'nome', e.target.value)} 
                         placeholder="NOME DO CHECKLIST"
                       />
                       <div style={{ display: 'flex', gap: '10px' }}>
                          <button className="btn-v8 primary" onClick={() => exportToExcel(turma.id, turma.nome)}><FileSpreadsheet size={16}/> EXPORTAR</button>
                       </div>

                    </div>

                    <div className="table-wrapper">
                      <table className="t-v8">
                        <thead>
                          <tr>
                             <th style={{ width: '50px' }}>#</th>
                             <th style={{ width: '150px' }}>PRAZO</th>
                             <th style={{ width: '150px' }}>RESPONSÁVEL</th>
                             <th style={{ width: '300px' }}>ETAPA DO PROCESSO</th>
                             <th>DESCRIÇÃO / LINKS</th>
                             <th style={{ width: '160px' }}>DATA</th>
                             <th style={{ width: '180px' }}>SITUAÇÃO</th>
                          </tr>
                        </thead>

                         <tbody>
                          {turmaItens.sort((a,b) => (a.item_n ?? 0) - (b.item_n ?? 0)).map(item => {
                            const resp = turmaRespostasMap[`${item.id}-${turma.id}`]
                            return (

                              <tr key={item.id}>
                                <td className="center"><span className="n-pill">{item.item_n}</span></td>
                                <td className="bold">{item.contexto}</td>
                                <td className="blue-txt">{item.responsavel}</td>
                                <td className="bold">
                                   <div className="row-between" style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap: '8px'}}>
                                      {item.titulo}
                                      {isAdmin && (
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                          <button className="edit-btn" onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}><Edit3 size={14}/></button>
                                          <button className="del-btn" onClick={async (e) => {
                                            e.stopPropagation();
                                            if (confirm(`DESEJA EXCLUIR A ETAPA #${item.item_n}?`)) {
                                              await supabase.from('checklist_itens').delete().eq('id', item.id)
                                              setItens(prev => prev.filter(i => i.id !== item.id))
                                            }
                                          }}><Trash2 size={14}/></button>
                                        </div>
                                      )}
                                   </div>
                                </td>
                                <td className="dim">{renderFormattedText(item.descricao)}</td>
                                <td>
                                  <input 
                                    type="date" 
                                    className="inp-v8" 
                                    value={resp?.valor_data || ''} 
                                    onChange={e => performSave(item.id, turma.id, { valor_data: e.target.value })} 
                                  />
                                </td>
                                <td>
                                   <div className="p-rel">
                                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '5px' }}>
                                        <input 
                                          className="inp-v8 status-inp" 
                                          value={resp?.valor_texto || ''} 
                                          onChange={e => performSave(item.id, turma.id, { valor_texto: e.target.value.toUpperCase() })} 
                                        />
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
                    </div>

                    {isAdmin && (
                      <div className="footer-v8">
                        <button className="add-v8" onClick={async () => {
                           const maxN = Math.max(0, ...turmaItens.map(i => i.item_n ?? 0))
                           const { data } = await supabase.from('checklist_itens').insert({
                             item_n: maxN + 1,
                             titulo: 'NOVA ETAPA',
                             contexto: 'D-X',
                             responsavel: 'ADM',
                             ordem: maxN + 1,
                             tipo_campo: 'check',
                             turma_id: turma.id
                           }).select().single()
                           if (data) setItens(prev => [...prev, data])
                        }}>
                           <Plus size={18} /> ADICIONAR NOVA ETAPA
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


      {/* MODAL IMPORTAÇÃO */}


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
        .checklist-v9 { display: flex; flex-direction: column; gap: 20px; color: #fff; text-transform: uppercase; padding-bottom: 80px; font-family: 'Inter', sans-serif; }
        .glass { background: rgba(10, 10, 18, 0.96); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; }
        
        .main-header { padding: 30px; display: flex; justify-content: space-between; align-items: center; }
        .checklist-container { display: flex; flex-direction: column; gap: 15px; }

        .instance-header { padding: 25px 30px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.3s; }
        .instance-header:hover { background: rgba(255,255,255,0.02); }
        .instance-header .turma-name { font-size: 18px; font-weight: 900; color: #fff; letter-spacing: -0.02em; }
        .instance-header .turma-meta { font-size: 10px; color: #555; font-weight: 700; display: block; }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 10px currentColor; }
        .status-dot.gold { background: #ffcc00; color: #ffcc00; }
        .status-dot.blue { background: #4f7cff; color: #4f7cff; }
        .master-badge { background: rgba(255,204,0,0.1); color: #ffcc00; font-size: 9px; padding: 2px 8px; border-radius: 6px; font-weight: 900; margin-left: 8px; }

        .instance-content { margin-top: -10px; }
        .content-inner { padding: 0; background: rgba(0,0,0,0.2); border-radius: 0 0 20px 20px; overflow: hidden; }
        
        .table-header { padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03); background: rgba(0,0,0,0.3); }
        .table-wrapper { overflow-x: auto; width: 100%; }

        .h-v8-badge { width: 44px; height: 44px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .h-v8-title { background: transparent; border: none; font-size: 18px; font-weight: 900; color: #fff; width: 300px; outline: none; text-transform: uppercase; }

        .t-v8 { width: 100%; border-collapse: collapse; min-width: 1200px; table-layout: fixed; }
        .t-v8 th { background: rgba(0,0,0,0.5); padding: 15px; font-size: 9px; color: #444; font-weight: 900; text-align: left; position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #1a1a24; }
        .t-v8 td { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 12px; word-break: break-word; overflow-wrap: anywhere; }
        
        .progress-pill { background: rgba(16, 217, 140, 0.1); color: #10d98c; font-size: 9px; padding: 2px 8px; border-radius: 6px; font-weight: 900; box-shadow: 0 0 10px rgba(16, 217, 140, 0.1); }

        /* MODAL STYLES RECONSTRUCTED */
        .overlay-v8 { 
          position: fixed; inset: 0; background: rgba(0,0,0,0.8); 
          backdrop-filter: blur(20px); z-index: 9999; display: flex; 
          align-items: center; justify-content: center; padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }
        .modal-v8 { 
          width: 100%; max-width: 650px; border-radius: 30px; 
          background: rgba(15, 15, 25, 0.95); 
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 40px 100px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05);
          overflow: hidden;
        }
        .m-h { padding: 30px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
        .m-b { padding: 30px; display: flex; flex-direction: column; gap: 25px; }
        .m-f { padding: 25px 30px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: flex-end; align-items: center; gap: 20px; }
        
        .modal-icon-header { width: 44px; height: 44px; background: rgba(79, 124, 255, 0.1); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #4f7cff; }
        .modal-grid-top { display: grid; grid-template-columns: 80px 1fr 1fr; gap: 15px; }

        .f-group { display: flex; flex-direction: column; gap: 8px; }
        .f-group label { font-size: 9px; font-weight: 900; color: #444; letter-spacing: 0.1em; }
        .main-title-inp { font-size: 16px !important; font-weight: 800 !important; color: #10d98c !important; }
        .desc-area { text-transform: none; line-height: 1.6; font-size: 13px; color: #aaa; min-height: 120px; }

        .close-x { background: rgba(255,255,255,0.03); border: none; color: #555; cursor: pointer; padding: 10px; border-radius: 12px; transition: 0.2s; }
        .close-x:hover { background: rgba(255,77,106,0.1); color: #ff4d6a; transform: scale(1.1); }
        
        .big-btn { padding: 16px 32px !important; font-size: 12px !important; letter-spacing: 0.05em; }

        .n-pill { background: rgba(255,255,255,0.03); padding: 4px 10px; border-radius: 8px; color: #666; font-weight: 900; }
        .bold { font-weight: 800; color: #eee; } 
        .blue-txt { color: #4f7cff; font-weight: 700; font-size: 11px; } 
        .dim { color: #666; font-size: 11px; max-width: 400px; text-transform: none; line-height: 1.5; }
        
        .inp-v8 { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 12px 15px; color: #fff; width: 100%; outline: none; font-size: 13px; transition: 0.2s; }
        .inp-v8:focus { border-color: #4f7cff; background: rgba(79, 124, 255, 0.05); }
        .status-inp { color: #10d98c; font-weight: 800; }
        .p-rel { position: relative; width: 180px; }
        .loader-mini { position: absolute; top: -5px; right: -5px; background: #4f7cff; border-radius: 50%; padding: 3px; }

        .btn-v8 { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-size: 10px; font-weight: 800; cursor: pointer; border: none; transition: 0.2s; }
        .btn-v8.primary { background: #4f7cff; color: #fff; }
        .primary-gradient { background: linear-gradient(135deg, #4f7cff, #8b5cf6); color: #fff; box-shadow: 0 10px 20px rgba(79, 124, 255, 0.2); }
        
        .footer-v8 { padding: 30px; display: flex; justify-content: center; }
        .add-v8 { background: transparent; border: 1.5px dashed rgba(255,255,255,0.05); color: #444; padding: 15px 40px; border-radius: 18px; font-weight: 900; cursor: pointer; transition: 0.2s; }
        .add-v8:hover { border-color: #4f7cff; color: #4f7cff; }

        .edit-btn, .del-btn { background: none; border: none; opacity: 0.3; cursor: pointer; transition: 0.2s; padding: 6px; }
        .edit-btn:hover { opacity: 1; color: #4f7cff; }
        .del-btn:hover { opacity: 1; color: #ff4d6a; }

        .icon-expand { color: #333; transition: 0.3s; }
        .checklist-instance.expanded .icon-expand { transform: rotate(180deg); color: #4f7cff; }
        
        .scale-in { animation: scaleIn 0.3s cubic-bezier(0.2, 1, 0.3, 1); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateY(-15px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }


      `}</style>
    </div>
  )
}
