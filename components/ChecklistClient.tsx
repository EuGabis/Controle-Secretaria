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
  FileDown, FileUp
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
  
  // Estados de Importação
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
    if (!error && data) setRespostas(prev => prev.map(r => (r.item_id === itemId) ? data : r))
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

  // --- LÓGICA DE IMPORTAÇÃO INTELIGENTE ---
  const processImport = async () => {
    if (!importFile || !isAdmin) return
    setIsImporting(true)
    
    try {
      const text = await importFile.text()
      const rows = text.split(/\r?\n/).filter(line => line.trim().length > 0)
      
      // Detecta separador (; ou ,)
      const delimiter = text.includes(';') ? ';' : ','
      const newItems: any[] = []
      
      rows.forEach((row, index) => {
          // Pula cabeçalho se houver (detecção simples: se não começar com número ou for a linha 0 e parecer cabeçalho)
          if (index === 0 && row.toLowerCase().includes('item') && row.toLowerCase().includes('etapa')) return

          const cols = row.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''))
          
          let item_n = 1
          let titulo = ''
          let responsavel = ''
          let contexto = ''
          let descricao = ''

          if (cols.length === 1) {
              // Formato Simples: "1 Agendar"
              const match = cols[0].match(/^(\d+)[\.\s]+(.*)$/)
              if (match) {
                  item_n = parseInt(match[1])
                  titulo = match[2]
              } else {
                  item_n = index + 1
                  titulo = cols[0]
              }
          } else {
              // Formato Tabela: Item;Prazo;Responsável;Etapa;Descrição
              // Ajusta mapeamento baseado no print do usuário
              item_n = parseInt(cols[0]) || index + 1
              contexto = cols[1] || ''
              responsavel = cols[2] || ''
              titulo = cols[3] || cols[0] // Fallback se o título estiver na coluna 0
              descricao = cols[4] || ''
              
              // Se o título veio com o número junto (ex: "1 Agendar...")
              if (titulo.match(/^\d+[\.\s]/)) {
                  titulo = titulo.replace(/^\d+[\.\s]+/, '')
              }
          }

          if (titulo) {
            newItems.push({
              item_n,
              titulo,
              responsavel: responsavel || 'Responsável',
              contexto: contexto || 'Prazo',
              descricao,
              tipo_campo: 'check',
              ordem: item_n
            })
          }
      })

      if (newItems.length === 0) throw new Error("Nenhum item válido encontrado no arquivo.")

      if (importReplace) {
          // Limpa itens antigos (Cascata vai limpar respostas)
          await supabase.from('checklist_itens').delete().neq('id', 'placeholder')
      }

      // Inserção em lote
      const { data, error } = await supabase.from('checklist_itens').insert(newItems).select()
      
      if (error) throw error
      
      if (data) setItens(data)
      setIsImportModalOpen(false)
      alert(`${data?.length} processos importados com sucesso!`)

    } catch (err: any) {
      alert(`Erro na importação: ${err.message}`)
    } finally {
      setIsImporting(false)
      setImportFile(null)
    }
  }

  return (
    <div className="checklist-v7-container">
      {/* CABEÇALHO COMPACTO */}
      <div className="header-v6 glass">
        <div className="h-left">
           <div className="h-brand"><DatabaseZap size={22} /></div>
           <div className="h-text">
             <div className="h-row">
                <input 
                  className="h-title-input" value={customTitle} 
                  onChange={e => setCustomTitle(e.target.value)} 
                  onBlur={e => saveHeader('nome', e.target.value)}
                />
                {saving === 'header' && <Loader2 size={12} className="spin blue-txt" />}
             </div>
             <input 
               className="h-sub-input" value={customSub} 
               onChange={e => setCustomSub(e.target.value)}
               onBlur={e => saveHeader('descricao', e.target.value)}
             />
           </div>
        </div>
        <div className="h-right">
           {isAdmin && (
             <button className="h-btn silver purple-glow" onClick={() => setIsImportModalOpen(true)}>
               <FileUp size={16}/> Importar CSV
             </button>
           )}
           <button className="h-btn silver" onClick={() => {
              const headers = ['#', 'PRAZO', 'RESPONSÁVEL', 'ETAPA', 'DESCRIÇÃO', 'STATUS']
              const csv = [headers, ...itens.map(i => [i.item_n, i.contexto, i.responsavel, i.titulo, i.descricao, turmaRespostasMap[i.id]?.valor_texto || ''])]
              const content = csv.map(r => r.join(';')).join('\n')
              const link = document.createElement('a'); link.href = encodeURI("data:text/csv;charset=utf-8,\uFEFF" + content); link.download = 'export.csv'; link.click()
           }}><FileDown size={16}/> Exportar</button>
        </div>
      </div>

      {/* QUADRO PLANILHA */}
      <div className="q-viewport glass">
        <table className="q-table">
          <thead>
            <tr>
              <th className="th-q center">#</th>
              <th className="th-q">PRAZO</th>
              <th className="th-q">RESPONSÁVEL</th>
              <th className="th-q">ETAPA DO PROCESSO</th>
              <th className="th-q">DESCRIÇÃO DETALHADA</th>
              <th className="th-q">DATA</th>
              <th className="th-q">SITUAÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const resp = turmaRespostasMap[item.id]
              const isSaving = saving === `cell-${item.id}`
              return (
                <tr key={item.id} className="tr-q">
                  <td className="td-q center">
                    <div className="n-col">
                      <span className="n-pill">{item.item_n}</span>
                      {isAdmin && <button className="trash" onClick={() => handleDeleteItem(item.id)}><Trash size={12}/></button>}
                    </div>
                  </td>
                  <td className="td-q font-bold color-w">{item.contexto}</td>
                  <td className="td-q blue-txt">{item.responsavel}</td>
                  <td className="td-q font-bold">
                    <div className="edit-wrap">
                       {item.titulo}
                       {isAdmin && <button className="pencil" onClick={() => setEditingItem(item)}><Edit3 size={11}/></button>}
                    </div>
                  </td>
                  <td className="td-q desc-txt">{item.descricao}</td>
                  <td className="td-q">
                    <input type="date" className="inp-q" value={resp?.valor_data || ''} onChange={e => handleLocalChange(item.id, 'valor_data', e.target.value)} onBlur={e => performSave(item.id, { valor_data: e.target.value })} />
                  </td>
                  <td className="td-q">
                    <div className="status-wrap">
                      <input 
                        type="text" className="inp-q status-f" placeholder="..."
                        value={resp?.valor_texto || ''}
                        onChange={e => handleLocalChange(item.id, 'valor_texto', e.target.value)}
                        onBlur={e => performSave(item.id, { valor_texto: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && performSave(item.id, { valor_texto: (e.target as HTMLInputElement).value })}
                      />
                      {isSaving && <div className="save-icon"><Loader2 size={10} className="spin" /></div>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {isAdmin && <div className="footer-v6"><button className="add-btn-v6" onClick={handleAddItem}><Plus size={16}/> Adicionar Etapa Manul</button></div>}
      </div>

      {/* MODAL DE IMPORTAÇÃO */}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsImportModalOpen(false)}>
           <div className="modal-box glass" onClick={e => e.stopPropagation()}>
              <div className="modal-h">
                 <div className="row-center">
                    <UploadCloud className="blue-txt" size={24} />
                    <h3 style={{marginLeft: 10}}>Importador de Processos Inteligente</h3>
                 </div>
                 <button onClick={() => setIsImportModalOpen(false)}><X/></button>
              </div>
              <div className="modal-b">
                 <div className="import-zone">
                    <p>Selecione um arquivo <strong>CSV</strong> exportado do Excel ou Planilhas Google.</p>
                    <input 
                      type="file" accept=".csv" 
                      onChange={e => setImportFile(e.target.files?.[0] || null)} 
                      style={{marginTop: 15}}
                    />
                 </div>
                 
                 <div className="alert-box">
                    <p><strong>Dica:</strong> O sistema identifica automaticamente colunas de Item, Nome, Responsável e Prazo.</p>
                 </div>

                 <label className="check-row">
                    <input type="checkbox" checked={importReplace} onChange={e => setImportReplace(e.target.checked)} />
                    <span>⚠️ Substituir todos os itens atuais por este novo arquivo</span>
                 </label>
              </div>
              <div className="modal-f">
                 <button className="h-btn silver" onClick={() => setIsImportModalOpen(false)}>Sair</button>
                 <button 
                  className={`h-btn primary ${isImporting ? 'disabled' : ''}`} 
                  onClick={processImport}
                  disabled={!importFile || isImporting}
                 >
                    {isImporting ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                    {isImporting ? 'Processando...' : 'Iniciar Importação'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
           <div className="modal-box glass" onClick={e => e.stopPropagation()}>
              <div className="modal-h"><h3>✏️ Ajustar Etapa #{editingItem.item_n}</h3><button onClick={() => setEditingItem(null)}><X/></button></div>
              <div className="modal-b">
                 <div className="row-split">
                    <div className="inp-g flex-1">
                      <label>Nº Item</label>
                      <input type="number" className="inp-q" value={editingItem.item_n} onChange={e => setEditingItem({...editingItem, item_n: parseInt(e.target.value)})} />
                    </div>
                    <div className="inp-g flex-3">
                      <label>Prazo / Meta</label>
                      <input className="inp-q" value={editingItem.contexto || ''} onChange={e => setEditingItem({...editingItem, contexto: e.target.value})} />
                    </div>
                 </div>
                 <div className="inp-g">
                    <label>Responsável Padrão</label>
                    <input className="inp-q" value={editingItem.responsavel || ''} onChange={e => setEditingItem({...editingItem, responsavel: e.target.value})} />
                 </div>
                 <div className="inp-g">
                    <label>Título da Etapa</label>
                    <input className="inp-q" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value})} />
                 </div>
                 <div className="inp-g">
                    <label>Descrição Detalhada</label>
                    <textarea className="inp-q" rows={6} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} />
                 </div>
              </div>
              <div className="modal-f">
                 <button className="h-btn silver" onClick={() => setEditingItem(null)}>Cancelar</button>
                 <button className="h-btn primary" onClick={async () => {
                    await supabase.from('checklist_itens').update(editingItem).eq('id', editingItem.id)
                    setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i)); setEditingItem(null)
                 }}>Salvar Mudanças</button>
              </div>
           </div>
        </div>
      )}

      <style jsx>{`
        .checklist-v7-container { display: flex; flex-direction: column; gap: 15px; animation: fadeIn 0.4s ease; padding-bottom: 50px; color: #fff; }
        .glass { background: rgba(10, 10, 20, 0.98); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
        
        .header-v6 { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; }
        .h-left { display: flex; align-items: center; gap: 16px; flex: 1; }
        .h-brand { width: 44px; height: 44px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 15px rgba(79,124,255,0.3); }
        .h-text { flex: 1; }
        .h-row { display: flex; align-items: center; gap: 10px; }
        .h-title-input { background: transparent; border: none; font-size: 20px; font-weight: 800; color: #fff; outline: none; border-bottom: 2px solid transparent; width: 450px; }
        .h-title-input:focus { border-color: #4f7cff; }
        .h-sub-input { background: transparent; border: none; font-size: 11px; color: #6e6e80; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; outline: none; width: 100%; margin-top: 2px; }

        .h-btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: 0.2s; }
        .h-btn.primary { background: #4f7cff; color: #fff; }
        .h-btn.silver { background: rgba(255,255,255,0.05); color: #fff; }
        .h-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .purple-glow { border-color: #8b5cf6 !important; color: #a786ff !important; }

        .q-viewport { overflow: auto; max-height: 80vh; background: rgba(0,0,0,0.2); }
        .q-table { width: 100%; border-collapse: collapse; min-width: 1450px; }
        .th-q { position: sticky; top: 0; background: #080811; padding: 16px; font-size: 10px; color: #6e6e80; font-weight: 800; text-transform: uppercase; text-align: left; z-index: 10; border-bottom: 2px solid #252545; }
        .td-q { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; vertical-align: top; }
        
        .blue-txt { color: #4f7cff; font-weight: 700; }
        .desc-txt { color: #8a8a9c; font-size: 12px; line-height: 1.6; max-width: 550px; white-space: pre-wrap; }
        .font-bold { font-weight: 700; }
        
        .inp-q { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px; color: #fff; width: 100%; outline: none; font-size: 13px; }
        .status-f { font-weight: 700; color: #10d98c; border-color: rgba(16, 217, 140, 0.2); }
        .status-wrap { position: relative; width: 220px; }
        .save-icon { position: absolute; top: -8px; right: -8px; background: #4f7cff; border-radius: 50%; padding: 4px; }

        /* IMPORT MODAL SPECIFIC */
        .import-zone { background: rgba(255,255,255,0.03); border: 2px dashed rgba(255,255,255,0.1); padding: 30px; border-radius: 16px; text-align: center; }
        .alert-box { background: rgba(79,124,255,0.1); border-left: 4px solid #4f7cff; padding: 15px; border-radius: 8px; font-size: 12px; }
        .check-row { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; border-radius: 8px; transition: 0.2s; }
        .check-row:hover { background: rgba(255,0,0,0.1); }
        .check-row span { font-size: 13px; color: #ff4d6a; font-weight: 700; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-box { width: 680px; animation: zoomIn 0.3s ease; }
        .modal-h { padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
        .modal-b { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
        .modal-f { padding: 20px 24px; display: flex; justify-content: flex-end; gap: 12px; }
        .inp-g { display: flex; flex-direction: column; gap: 8px; }
        .inp-g label { font-size: 10px; font-weight: 800; color: #6e6e80; text-transform: uppercase; }
        .row-split { display: flex; gap: 15px; }
        .flex-1 { flex: 1; }
        .flex-3 { flex: 3; }
        .row-center { display: flex; align-items: center; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
