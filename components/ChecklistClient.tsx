'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Edit3, Save, Loader2, X, Download, DatabaseZap,
  UploadCloud, FileDown, FileUp, FileSpreadsheet, LayoutDashboard, List,
  Link as LinkIcon, ExternalLink, PieChart as PieChartIcon, BarChart3
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'

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
  const [viewMode, setViewMode] = useState<'list' | 'dashboard'>('list')
  
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

  // --- LÓGICA DE DASHBOARD ---
  const stats = useMemo(() => {
    const total = itens.length
    const concluidas = itens.filter(i => {
      const r = turmaRespostasMap[i.id]
      return r?.valor_texto?.toUpperCase().includes('OK') || 
             r?.valor_texto?.toUpperCase().includes('FEITO') || 
             r?.valor_data
    }).length
    const pendentes = total - concluidas
    const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0
    return { total, concluidas, pendentes, pct }
  }, [itens, turmaRespostasMap])

  const chartData = [
    { name: 'CONCLUÍDAS', value: stats.concluidas, color: '#10d98c' },
    { name: 'PENDENTES', value: stats.pendentes, color: '#ff4d6a' },
  ]

  const barData = useMemo(() => {
    const groups: Record<string, { name: string, pronto: number, total: number }> = {}
    itens.forEach(i => {
      const key = i.contexto || 'OUTROS'
      if (!groups[key]) groups[key] = { name: key.toUpperCase(), pronto: 0, total: 0 }
      groups[key].total++
      const r = turmaRespostasMap[i.id]
      if (r?.valor_texto || r?.valor_data) groups[key].pronto++
    })
    return Object.values(groups).slice(0, 8) // Top 8 fases
  }, [itens, turmaRespostasMap])

  const renderFormattedText = (text: string | null) => {
    if (!text) return '-'
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const url = part.startsWith('http') ? part : `https://${part}`
        return <a key={i} href={url} target="_blank" rel="noreferrer" className="link-v7">{part} <ExternalLink size={10} style={{display:'inline'}}/></a>
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
    <div className="checklist-integrated-v8">
      {/* HEADER DINÂMICO */}
      <div className="h-v8 glass">
        <div className="h-v8-left">
           <div className="h-v8-badge"><DatabaseZap size={22} /></div>
           <div className="h-v8-info">
              <input className="h-v8-title" value={customTitle} onChange={e => setCustomTitle(e.target.value)} onBlur={e => saveHeader('nome', e.target.value)} />
              <input className="h-v8-sub" value={customSub} onChange={e => setCustomSub(e.target.value)} onBlur={e => saveHeader('descricao', e.target.value)} />
           </div>
        </div>
        <div className="h-v8-right">
           <div className="toggle-v8">
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><List size={16}/> PLANILHA</button>
              <button className={viewMode === 'dashboard' ? 'active' : ''} onClick={() => setViewMode('dashboard')}><LayoutDashboard size={16}/> INDICADORES</button>
           </div>
           {isAdmin && <button className="btn-v8 silver" onClick={() => setIsImportModalOpen(true)}><FileUp size={16}/> IMPORTAR</button>}
           <button className="btn-v8 primary" onClick={exportToExcel}><FileSpreadsheet size={16}/> EXPORTAR EXCEL</button>
        </div>
      </div>

      {viewMode === 'dashboard' ? (
        <div className="dash-v8 animation-fade">
           {/* CARDS DE RESUMO */}
           <div className="dash-cards">
              <div className="d-card glass border-blue">
                 <span className="d-label">TOTAL DE PROCESSOS</span>
                 <span className="d-value blue">{stats.total}</span>
              </div>
              <div className="d-card glass border-green">
                 <span className="d-label">CONCLUÍDOS (OK)</span>
                 <span className="d-value green">{stats.concluidas}</span>
              </div>
              <div className="d-card glass border-red">
                 <span className="d-label">PENDENTES</span>
                 <span className="d-value red">{stats.pendentes}</span>
              </div>
              <div className="d-card glass border-purple">
                 <span className="d-label">PERCENTUAL DE EXECUÇÃO</span>
                 <div className="d-row">
                    <span className="d-value purple">{stats.pct}%</span>
                    <div className="d-mini-progress"><div className="d-mini-fill" style={{width: `${stats.pct}%`}}></div></div>
                 </div>
              </div>
           </div>

           {/* GRÁFICOS */}
           <div className="dash-charts">
              <div className="chart-box glass">
                 <h3>DISTRIBUIÇÃO DE STATUS</h3>
                 <div style={{height: 300}}>
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                            {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                         </Pie>
                         <Tooltip contentStyle={{background:'#12121a', border:'1px solid #333', color:'#fff', borderRadius:10}} />
                         <Legend />
                      </PieChart>
                   </ResponsiveContainer>
                 </div>
              </div>
              <div className="chart-box glass">
                 <h3>PROGRESSO POR FASE / PRAZO</h3>
                 <div style={{height: 300}}>
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                         <XAxis dataKey="name" fontSize={10} stroke="#666" />
                         <YAxis fontSize={10} stroke="#666" />
                         <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                         <Bar dataKey="total" name="TOTAL" fill="#333" radius={[4,4,0,0]} />
                         <Bar dataKey="pronto" name="CONCLUÍDO" fill="#4f7cff" radius={[4,4,0,0]} />
                      </BarChart>
                   </ResponsiveContainer>
                 </div>
              </div>
           </div>
        </div>
      ) : (
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
                 {itens.map(item => {
                    const resp = turmaRespostasMap[item.id]
                    return (
                       <tr key={item.id}>
                          <td className="center"><span className="n-pill">{item.item_n}</span></td>
                          <td className="bold">{item.contexto}</td>
                          <td className="blue-txt">{item.responsavel}</td>
                          <td className="bold">
                             <div className="row-between">
                                {item.titulo}
                                {isAdmin && <button className="edit-btn" onClick={() => setEditingItem(item)}><Edit3 size={12}/></button>}
                             </div>
                          </td>
                          <td className="dim">{renderFormattedText(item.descricao)}</td>
                          <td><input type="date" className="inp-v8" value={resp?.valor_data || ''} onChange={e => performSave(item.id, { valor_data: e.target.value })} /></td>
                          <td>
                             <div className="p-rel">
                                <input className="inp-v8 status-inp" value={resp?.valor_texto || ''} onChange={e => performSave(item.id, { valor_texto: e.target.value.toUpperCase() })} />
                                {saving === `cell-${item.id}` && <div className="loader-mini"><Loader2 size={10} className="spin"/></div>}
                             </div>
                          </td>
                       </tr>
                    )
                 })}
              </tbody>
           </table>
        </div>
      )}

      {/* MODAL EDIÇÃO */}
      {editingItem && (
        <div className="overlay-v8" onClick={() => setEditingItem(null)}>
           <div className="modal-v8 glass" onClick={e => e.stopPropagation()}>
              <div className="m-h"><h3>EDITAR ETAPA #{editingItem.item_n}</h3><button onClick={() => setEditingItem(null)}><X/></button></div>
              <div className="m-b">
                 <input className="inp-v8" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value.toUpperCase()})} placeholder="TÍTULO" />
                 <textarea className="inp-v8" rows={6} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} placeholder="DESCRIÇÃO OU LINKS" />
              </div>
              <div className="m-f">
                 <button className="btn-v8 primary" onClick={async () => {
                    await supabase.from('checklist_itens').update(editingItem).eq('id', editingItem.id)
                    setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i)); setEditingItem(null)
                 }}><Save size={16}/> SALVAR MUDANÇAS</button>
              </div>
           </div>
        </div>
      )}

      <style jsx>{`
        .checklist-integrated-v8 { display: flex; flex-direction: column; gap: 20px; color: #fff; text-transform: uppercase; padding-bottom: 50px; }
        .glass { background: rgba(10, 10, 18, 0.98); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; }
        
        .h-v8 { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
        .h-v8-left { display: flex; align-items: center; gap: 15px; }
        .h-v8-badge { width: 45px; height: 45px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .h-v8-title { background: transparent; border: none; font-size: 20px; font-weight: 900; color: #fff; width: 400px; outline: none; text-transform: uppercase; }
        .h-v8-sub { background: transparent; border: none; font-size: 11px; color: #666; font-weight: 700; width: 100%; outline: none; margin-top: 2px; }

        .toggle-v8 { background: rgba(0,0,0,0.3); padding: 5px; border-radius: 12px; display: flex; gap: 5px; border: 1px solid rgba(255,255,255,0.05); }
        .toggle-v8 button { background: none; border: none; color: #666; font-size: 10px; font-weight: 800; padding: 8px 15px; border-radius: 8px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 6px; }
        .toggle-v8 button.active { background: #4f7cff; color: #fff; box-shadow: 0 4px 12px rgba(79,124,255,0.3); }

        .dash-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .d-card { padding: 22px; display: flex; flex-direction: column; gap: 8px; border-left: 4px solid #333; }
        .border-blue { border-left-color: #4f7cff; } .border-green { border-left-color: #10d98c; } .border-red { border-left-color: #ff4d6a; } .border-purple { border-left-color: #8b5cf6; }
        .d-label { font-size: 10px; font-weight: 800; color: #666; }
        .d-value { font-size: 32px; font-weight: 900; }
        .blue { color: #4f7cff; } .green { color: #10d98c; } .red { color: #ff4d6a; } .purple { color: #8b5cf6; }
        .d-mini-progress { height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; flex: 1; overflow: hidden; margin-top: 5px; }
        .d-mini-fill { height: 100%; background: #8b5cf6; }
        .d-row { display: flex; align-items: center; gap: 10px; flex: 1; }

        .dash-charts { display: grid; grid-template-columns: 1fr 2fr; gap: 15px; }
        .chart-box { padding: 24px; }
        .chart-box h3 { font-size: 13px; font-weight: 800; color: #fff; margin-bottom: 20px; text-align: center; }

        .t-v8 { width: 100%; border-collapse: collapse; min-width: 1400px; }
        .t-v8 th { background: #080811; padding: 16px; font-size: 10px; color: #666; font-weight: 900; text-align: left; position: sticky; top: 0; z-index: 10; border-bottom: 2px solid #222; }
        .t-v8 td { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; vertical-align: top; }
        .n-pill { background: rgba(255,255,255,0.05); padding: 5px 12px; border-radius: 8px; color: #4f7cff; font-weight: 900; }
        .bold { font-weight: 800; } .blue-txt { color: #4f7cff; font-weight: 700; } .dim { color: #888; font-size: 12px; line-height: 1.6; }
        .link-v7 { color: #4f7cff; text-decoration: underline; font-weight: 700; }
        .inp-v8 { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 10px; color: #fff; width: 100%; outline: none; font-size: 13px; }
        .status-inp { color: #10d98c; font-weight: 800; border-color: rgba(16,217,140,0.1); }
        .loader-mini { position: absolute; top: -8px; right: -8px; background: #4f7cff; border-radius: 50%; padding: 4px; }
        .p-rel { position: relative; width: 220px; }

        .btn-v8 { display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 12px; font-size: 12px; font-weight: 800; cursor: pointer; border: none; transition: 0.2s; }
        .btn-v8.primary { background: #4f7cff; color: #fff; }
        .btn-v8.silver { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); }
        .footer-v8 { padding: 30px; display: flex; justify-content: center; }
        .add-v8 { background: none; border: 2px dashed #444; color: #666; padding: 15px 30px; border-radius: 15px; font-weight: 800; cursor: pointer; }
        
        .overlay-v8 { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .modal-v8 { width: 650px; } .m-h { padding: 24px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; } .m-b { padding: 24px; display: flex; flex-direction: column; gap: 15px; } .m-f { padding: 20px 24px; display: flex; justify-content: flex-end; }
        
        .animation-fade { animation: fadeIn 0.4s ease; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
