'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Edit3, CheckCircle2, Circle, 
  Calendar, Type, Save, Loader2, X, ChevronRight, 
  Settings2, GripVertical, User2, Clock, ExternalLink,
  Download, Filter, Search, Info
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  itens: ChecklistItem[]
  turmas: ChecklistTurma[]
  respostas: ChecklistResposta[]
  perfil: string
  usuarioId: string
}

export default function ChecklistClient({ itens: initialItens, turmas: initialTurmas, respostas: initialRespostas, perfil, usuarioId }: Props) {
  const [itens, setItens] = useState(initialItens)
  const [turmas, setTurmas] = useState(initialTurmas)
  const [respostas, setRespostas] = useState(initialRespostas)
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(initialTurmas[0]?.id || '')
  
  const [saving, setSaving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null) // Modal de edição
  const [isExporting, setIsExporting] = useState(false)
  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  const selectedTurma = useMemo(() => turmas.find(t => t.id === selectedTurmaId), [turmas, selectedTurmaId])

  // Filtra as respostas apenas da turma selecionada
  const turmaRespostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.filter(r => r.turma_id === selectedTurmaId).forEach(r => {
      map[r.item_id] = r
    })
    return map
  }, [respostas, selectedTurmaId])

  // Função para transformar texto em links clicáveis
  const linkify = (text: string) => {
    if (!text) return null
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="link-text">
            {part.length > 30 ? part.substring(0, 30) + '...' : part} <ExternalLink size={10} />
          </a>
        )
      }
      return part
    })
  }

  const saveCell = useCallback(async (itemId: string, updates: Partial<ChecklistResposta>) => {
    if (!selectedTurmaId) return
    const key = `cell-${itemId}`
    setSaving(key)
    
    const existing = turmaRespostasMap[itemId]

    if (existing) {
      const { data, error } = await supabase
        .from('checklist_respostas')
        .update({ ...updates, respondido_por: usuarioId, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select().single()
      if (!error && data) setRespostas(prev => prev.map(r => r.id === existing.id ? { ...r, ...data } : r))
    } else {
      const { data, error } = await supabase
        .from('checklist_respostas')
        .insert({ item_id: itemId, turma_id: selectedTurmaId, ...updates, respondido_por: usuarioId })
        .select().single()
      if (!error && data) setRespostas(prev => [...prev, data])
    }
    setTimeout(() => setSaving(null), 600)
  }, [turmaRespostasMap, selectedTurmaId, supabase, usuarioId])

  const handleUpdateItemTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem || !isAdmin) return
    
    setSaving(`modal-${editingItem.id}`)
    const { error } = await supabase.from('checklist_itens').update({
      titulo: editingItem.titulo,
      contexto: editingItem.contexto,
      responsavel: editingItem.responsavel,
      descricao: editingItem.descricao
    }).eq('id', editingItem.id)

    if (!error) {
      setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i))
      setEditingItem(null)
    }
    setSaving(null)
  }

  const exportToCSV = () => {
    if (!selectedTurma) return
    setIsExporting(true)
    
    const rows = [
      ['ITEM', 'PRAZO', 'RESPONSÁVEL', 'ETAPA', 'DESCRIÇÃO', 'DATA REALIZADA', 'STATUS'],
      ...itens.map(item => {
        const resp = turmaRespostasMap[item.id]
        return [
          item.item_n,
          item.contexto,
          item.responsavel,
          item.titulo,
          item.descricao?.replace(/\n/g, ' '),
          resp?.valor_data || '-',
          resp?.status_check ? 'OK' : 'PENDENTE'
        ]
      })
    ]

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `checklist_${selectedTurma.nome.toLowerCase().replace(/\s/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setTimeout(() => setIsExporting(false), 1000)
  }

  return (
    <div className="checklist-container">
      {/* HEADER SECTION */}
      <div className="checklist-header">
        <div className="header-info">
          <div className="icon-wrapper"><Settings2 size={24} color="#fff" /></div>
          <div>
            <h1 className="text-gradient">Acompanhamento Imersão</h1>
            <p>Selecione a turma para gerenciar o checklist detalhado</p>
          </div>
        </div>

        <div className="header-controls">
          <div className="turma-selector-wrapper">
            <Filter size={14} className="filter-icon" />
            <select 
              className="turma-select" 
              value={selectedTurmaId} 
              onChange={(e) => setSelectedTurmaId(e.target.value)}
            >
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          
          <button className="glass-btn silver" onClick={exportToCSV} disabled={isExporting}>
            {isExporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />} 
            Exportar CSV
          </button>
        </div>
      </div>

      {/* SPREADSHEET VIEW */}
      <div className="checklist-grid-wrapper glass">
        <table className="checklist-table">
          <thead>
            <tr>
              <th className="header-cell col-n">ITEM</th>
              <th className="header-cell col-prazo">PRAZO</th>
              <th className="header-cell col-resp">RESPONSÁVEL</th>
              <th className="header-cell col-etapa">ETAPA / ITEM</th>
              <th className="header-cell col-desc">DESCRIÇÃO DO PROCESSO</th>
              <th className="header-cell col-data">DATA REALIZADA</th>
              <th className="header-cell col-status">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const resp = turmaRespostasMap[item.id]
              const isSaving = saving === `cell-${item.id}`
              
              return (
                <tr key={item.id} className="row-hover">
                  <td className="body-cell col-n text-muted">{item.item_n}</td>
                  <td className="body-cell col-prazo font-bold">{item.contexto}</td>
                  <td className="body-cell col-resp blue-text">{item.responsavel}</td>
                  <td className="body-cell col-etapa white-text">
                    <div className="etapa-wrapper">
                      {item.titulo}
                      {isAdmin && (
                        <button className="edit-btn-mini" onClick={() => setEditingItem(item)}>
                          <Edit3 size={10} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="body-cell col-desc">
                    <div className="desc-text">
                      {linkify(item.descricao || '')}
                    </div>
                  </td>
                  <td className="body-cell col-data">
                    <div className="input-container">
                      <input 
                        type="date" 
                        className="date-input-borderless" 
                        value={resp?.valor_data || ''} 
                        onChange={(e) => saveCell(item.id, { valor_data: e.target.value })}
                      />
                    </div>
                  </td>
                  <td className="body-cell col-status">
                    <div className="status-container">
                      <button 
                        className={`status-btn ${resp?.status_check ? 'active' : ''}`}
                        onClick={() => saveCell(item.id, { status_check: !resp?.status_check })}
                      >
                        {resp?.status_check ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        <span>{resp?.status_check ? 'OK' : 'Pendente'}</span>
                      </button>
                      {isSaving && <Loader2 size={12} className="spin saving-dot" />}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL DE EDIÇÃO (ADMIN ONLY) */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Etapa #{editingItem.item_n}</h2>
              <button className="close-btn" onClick={() => setEditingItem(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateItemTemplate} className="modal-form">
              <div className="form-group">
                <label>Título / Etapa</label>
                <input 
                  type="text" 
                  value={editingItem.titulo} 
                  onChange={e => setEditingItem({...editingItem, titulo: e.target.value})}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Prazo</label>
                  <input 
                    type="text" 
                    value={editingItem.contexto || ''} 
                    onChange={e => setEditingItem({...editingItem, contexto: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Responsável</label>
                  <input 
                    type="text" 
                    value={editingItem.responsavel || ''} 
                    onChange={e => setEditingItem({...editingItem, responsavel: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Descrição Detalhada (URLs serão clicáveis)</label>
                <textarea 
                  rows={8}
                  value={editingItem.descricao || ''} 
                  onChange={e => setEditingItem({...editingItem, descricao: e.target.value})}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="glass-btn secondary" onClick={() => setEditingItem(null)}>Cancelar</button>
                <button type="submit" className="glass-btn primary" disabled={!!saving}>
                  {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .checklist-container { display: flex; flex-direction: column; gap: 24px; animation: fadeIn 0.4s ease; padding-bottom: 40px; }
        .checklist-header { display: flex; justify-content: space-between; align-items: center; }
        .header-info { display: flex; align-items: center; gap: 16px; }
        .icon-wrapper { width: 44px; height: 44px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(79,124,255,0.3); }
        .checklist-header h1 { font-size: 24px; font-weight: 800; margin: 0; color: #fff; }
        .checklist-header p { color: var(--text-muted); font-size: 13px; margin: 0; }
        
        .header-controls { display: flex; gap: 12px; align-items: center; }
        .turma-selector-wrapper { background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 10px; display: flex; align-items: center; padding: 0 12px; height: 42px; transition: 0.2s; }
        .turma-selector-wrapper:focus-within { border-color: #4f7cff; background: rgba(79,124,255,0.05); }
        .filter-icon { color: var(--text-muted); margin-right: 8px; }
        .turma-select { background: transparent; border: none; color: #fff; font-size: 14px; font-weight: 600; outline: none; cursor: pointer; min-width: 150px; }
        
        .glass-btn { padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.1); transition: 0.2s; }
        .glass-btn.primary { background: #4f7cff; color: #fff; }
        .glass-btn.secondary { background: rgba(255,255,255,0.05); color: #fff; }
        .glass-btn.silver { background: rgba(255,255,255,0.08); color: #fff; }
        .glass-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
        .glass-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .checklist-grid-wrapper { border-radius: 16px; overflow: auto; border: 1px solid var(--border); background: rgba(10,10,20,0.6); max-height: 75vh; }
        .checklist-table { width: 100%; border-collapse: separate; border-spacing: 0; }

        .header-cell { background: #12121e; padding: 16px 14px; font-size: 11px; font-weight: 800; color: #6e6e80; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 20; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; }
        
        .col-n { width: 60px; text-align: center; }
        .col-prazo { width: 150px; }
        .col-resp { width: 150px; }
        .col-etapa { width: 250px; }
        .col-desc { min-width: 400px; }
        .col-data { width: 160px; }
        .col-status { width: 140px; }

        .body-cell { padding: 14px; border-bottom: 1px solid var(--border); vertical-align: top; font-size: 13px; }
        .row-hover:hover { background: rgba(255,255,255,0.02); }

        .text-muted { color: #6e6e80; }
        .font-bold { font-weight: 700; color: #e0e0e6; }
        .blue-text { color: #4f7cff; font-weight: 600; }
        .white-text { color: #fff; font-weight: 700; }

        .etapa-wrapper { display: flex; align-items: start; gap: 8px; justify-content: space-between; }
        .edit-btn-mini { background: none; border: none; color: #4f7cff; cursor: pointer; opacity: 0; transition: 0.2s; padding: 4px; }
        .row-hover:hover .edit-btn-mini { opacity: 0.6; }
        .edit-btn-mini:hover { opacity: 1 !important; transform: scale(1.2); }

        .desc-text { color: #9494a3; line-height: 1.6; font-size: 12px; white-space: pre-wrap; }
        .link-text { color: #4f7cff; text-decoration: none; border-bottom: 1px solid transparent; transition: 0.2s; font-weight: 600; display: inline-flex; align-items: center; gap: 3px; }
        .link-text:hover { border-color: #4f7cff; background: rgba(79,124,255,0.1); border-radius: 2px; }

        .date-input-borderless { background: rgba(255,255,255,0.03); border: 1px solid transparent; color: #fff; padding: 8px; border-radius: 8px; width: 100%; outline: none; transition: 0.2s; cursor: pointer; }
        .date-input-borderless:hover { background: rgba(255,255,255,0.06); }
        .date-input-borderless:focus { border-color: #4f7cff; background: rgba(79,124,255,0.05); }

        .status-container { position: relative; width: 100%; }
        .status-btn { width: 100%; height: 42px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid transparent; color: #6e6e80; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: 0.3s; }
        .status-btn.active { background: rgba(16, 217, 140, 0.1); border-color: rgba(16, 217, 140, 0.2); color: #10d98c; }
        .status-btn:not(.active):hover { background: rgba(255,255,255,0.08); color: #fff; }
        .status-btn.active:hover { filter: brightness(1.2); }
        
        .saving-dot { position: absolute; top: -5px; right: -5px; color: #4f7cff; }

        /* MODAL */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: fadeInModal 0.3s ease; }
        .modal-content { width: 100%; max-width: 700px; border-radius: 24px; border: 1px solid var(--border); overflow: hidden; }
        .modal-header { padding: 24px; background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
        .modal-header h2 { font-size: 20px; font-weight: 800; color: #fff; margin: 0; }
        .modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-size: 12px; font-weight: 700; color: #6e6e80; text-transform: uppercase; letter-spacing: 0.05em; }
        .form-group input, .form-group textarea { background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 12px; padding: 12px; color: #fff; font-size: 14px; outline: none; transition: 0.2s; }
        .form-group input:focus, .form-group textarea:focus { border-color: #4f7cff; background: rgba(79,124,255,0.05); }
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 12px; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
