'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Edit3, CheckCircle2, Circle, 
  Calendar, Type, Save, Loader2, X, ChevronRight, 
  Settings2, GripVertical, MoreHorizontal 
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
  const [saving, setSaving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<{ id: string, titulo: string, tipo: string } | null>(null)
  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  // Mapeamento otimizado de respostas
  const respostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.forEach(r => {
      map[`${r.item_id}-${r.turma_id}`] = r
    })
    return map
  }, [respostas])

  // Lógica de Salvamento Universal (Spreadsheet Style)
  const saveCell = useCallback(async (itemId: string, turmaId: string, updates: Partial<ChecklistResposta>) => {
    const key = `${itemId}-${turmaId}`
    setSaving(key)
    
    const existing = respostasMap[key]

    if (existing) {
      const { data, error } = await supabase
        .from('checklist_respostas')
        .update({ ...updates, respondido_por: usuarioId, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()

      if (!error && data) {
        setRespostas(prev => prev.map(r => r.id === existing.id ? { ...r, ...data } : r))
      }
    } else {
      const { data, error } = await supabase
        .from('checklist_respostas')
        .insert({ item_id: itemId, turma_id: turmaId, ...updates, respondido_por: usuarioId })
        .select()
        .single()

      if (!error && data) {
        setRespostas(prev => [...prev, data])
      }
    }
    
    setTimeout(() => setSaving(null), 800)
  }, [respostasMap, supabase, usuarioId])

  // Handlers para Admin
  const handleAddItem = async () => {
    if (!isAdmin) return
    const titulo = prompt('Nome da nova etapa do processo:')
    if (!titulo) return
    const tipo = prompt('Tipo de campo (check, texto, data):', 'check') as any

    const { data, error } = await supabase
      .from('checklist_itens')
      .insert({ titulo, tipo_campo: tipo, ordem: itens.length })
      .select()
      .single()

    if (!error && data) setItens(prev => [...prev, data])
  }

  const handleAddTurma = async () => {
    if (!isAdmin) return
    const nome = prompt('Nome da nova Turma / Período:')
    if (!nome) return

    const { data, error } = await supabase
      .from('checklist_turmas')
      .insert({ nome })
      .select()
      .single()

    if (!error && data) setTurmas(prev => [...prev, data])
  }

  const handleDeleteItem = async (id: string) => {
    if (!isAdmin || !confirm('Excluir este item permanentemente?')) return
    const { error } = await supabase.from('checklist_itens').delete().eq('id', id)
    if (!error) setItens(prev => prev.filter(i => i.id !== id))
  }

  const handleDeleteTurma = async (id: string) => {
    if (!isAdmin || !confirm('Excluir esta turma inteira?')) return
    const { error } = await supabase.from('checklist_turmas').delete().eq('id', id)
    if (!error) setTurmas(prev => prev.filter(t => t.id !== id))
  }

  const renameTurma = async (id: string, oldName: string) => {
    if (!isAdmin) return
    const novoNome = prompt('Renomear turma:', oldName)
    if (!novoNome || novoNome === oldName) return
    const { error } = await supabase.from('checklist_turmas').update({ nome: novoNome }).eq('id', id)
    if (!error) setTurmas(prev => prev.map(t => t.id === id ? { ...t, nome: novoNome } : t))
  }

  return (
    <div className="checklist-container">
      {/* Header Profissional */}
      <div className="checklist-header">
        <div className="header-info">
          <div className="icon-wrapper">
            <Settings2 size={24} color="#fff" />
          </div>
          <div>
            <h1 className="text-gradient">Checklist Operacional</h1>
            <p>Gerenciamento de fluxos e prazos por turma</p>
          </div>
        </div>
        
        {isAdmin && (
          <div className="admin-actions">
            <button className="glass-btn secondary" onClick={handleAddItem}>
              <Plus size={16} /> Etapa
            </button>
            <button className="glass-btn primary" onClick={handleAddTurma}>
              <Plus size={16} /> Turma
            </button>
          </div>
        )}
      </div>

      {/* Grid Style Table */}
      <div className="checklist-grid-wrapper glass">
        <table className="checklist-table">
          <thead>
            <tr>
              <th className="sticky-col header-cell main-header">
                PROCESSO
              </th>
              {turmas.map(turma => (
                <th key={turma.id} className="header-cell column-header">
                  <div className="column-label">
                    <span onClick={() => renameTurma(turma.id, turma.nome)} style={{ cursor: isAdmin ? 'pointer' : 'default' }}>
                      {turma.nome}
                    </span>
                    {isAdmin && (
                      <button className="icon-btn delete" onClick={() => handleDeleteTurma(turma.id)}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itens.map((item, idx) => (
              <tr key={item.id} className="row-hover">
                <td className="sticky-col body-cell process-info">
                  <div className="process-content">
                    <div className="drag-handle"><GripVertical size={14} /></div>
                    <div className="process-text">
                      <span className="process-index">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="process-title">{item.titulo}</span>
                      <div className="process-badge">
                        {item.tipo_campo === 'check' && <CheckCircle2 size={10} />}
                        {item.tipo_campo === 'texto' && <Type size={10} />}
                        {item.tipo_campo === 'data' && <Calendar size={10} />}
                        {item.tipo_campo}
                      </div>
                    </div>
                    {isAdmin && (
                      <button className="icon-btn" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </td>
                
                {turmas.map(turma => {
                  const resp = respostasMap[`${item.id}-${turma.id}`]
                  const isSaving = saving === `${item.id}-${turma.id}`
                  
                  return (
                    <td key={turma.id} className="body-cell input-cell">
                      <div className={`cell-wrapper ${isSaving ? 'cell-saving' : ''}`}>
                        {/* INPUTS DINÂMICOS */}
                        {item.tipo_campo === 'check' && (
                          <button 
                            className={`check-input ${resp?.status_check ? 'checked' : ''}`}
                            onClick={() => saveCell(item.id, turma.id, { status_check: !resp?.status_check })}
                          >
                            {resp?.status_check ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                          </button>
                        )}

                        {item.tipo_campo === 'texto' && (
                          <textarea 
                            className="text-input"
                            placeholder="..."
                            defaultValue={resp?.valor_texto || ''}
                            onBlur={(e) => {
                              if (e.target.value !== (resp?.valor_texto || '')) {
                                saveCell(item.id, turma.id, { valor_texto: e.target.value })
                              }
                            }}
                          />
                        )}

                        {item.tipo_campo === 'data' && (
                          <div className="date-input-wrapper">
                            <input 
                              type="date"
                              className="date-input"
                              defaultValue={resp?.valor_data || ''}
                              onChange={(e) => {
                                saveCell(item.id, turma.id, { valor_data: e.target.value })
                              }}
                            />
                            {!resp?.valor_data && <Calendar className="date-icon" size={14} />}
                          </div>
                        )}

                        {isSaving && <div className="saving-indicator"><Loader2 size={10} className="spin" /></div>}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .checklist-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .checklist-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 4px;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .icon-wrapper {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 16px rgba(79, 124, 255, 0.3);
        }

        .checklist-header h1 {
          font-size: 26px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .checklist-header p {
          color: var(--text-muted);
          font-size: 14px;
          margin-top: 2px;
        }

        .admin-actions {
          display: flex;
          gap: 12px;
        }

        /* Buttons */
        .glass-btn {
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .glass-btn.primary {
          background: var(--accent-blue);
          color: white;
          box-shadow: 0 4px 12px rgba(79, 124, 255, 0.2);
        }

        .glass-btn.secondary {
          background: rgba(255,255,255,0.05);
          color: var(--text-primary);
          backdrop-filter: blur(10px);
        }

        .glass-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
          border-color: rgba(255,255,255,0.3);
        }

        /* Grid / Table */
        .checklist-grid-wrapper {
          border-radius: 20px;
          overflow: auto;
          position: relative;
          border: 1px solid var(--border);
          max-height: calc(100vh - 200px);
        }

        .checklist-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .header-cell {
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          padding: 16px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .sticky-col {
          position: sticky;
          left: 0;
          z-index: 30;
          width: 320px;
          min-width: 320px;
        }

        .main-header {
          z-index: 40;
          background: rgba(20, 20, 35, 1);
        }

        .column-header {
          min-width: 180px;
          text-align: center;
          border-left: 1px solid var(--border);
        }

        .column-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .process-info {
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border-right: 1px solid var(--border);
        }

        .process-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .drag-handle {
          cursor: grab;
          color: var(--text-muted);
          opacity: 0.3;
        }

        .process-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .process-index {
          font-size: 9px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--accent-blue);
          font-weight: 800;
        }

        .process-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .process-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--text-muted);
          background: rgba(255,255,255,0.05);
          padding: 2px 8px;
          border-radius: 6px;
          width: fit-content;
          text-transform: capitalize;
        }

        .body-cell {
          padding: 8px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }

        .input-cell {
          border-left: 1px solid var(--border);
          min-width: 180px;
        }

        .cell-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 50px;
          border-radius: 8px;
          transition: all 0.3s;
        }

        .cell-saving {
          background: rgba(79, 124, 255, 0.05);
        }

        /* Input Styles */
        .check-input {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .check-input:hover {
          transform: scale(1.2);
          color: var(--accent-blue);
        }

        .check-input.checked {
          color: var(--accent-green);
          filter: drop-shadow(0 0 8px rgba(16, 217, 140, 0.4));
        }

        .text-input {
          width: 100%;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          padding: 8px;
          color: var(--text-secondary);
          font-size: 13px;
          font-family: inherit;
          resize: none;
          min-height: 40px;
          text-align: center;
          transition: all 0.2s;
        }

        .text-input:focus {
          outline: none;
          background: rgba(255,255,255,0.05);
          border-color: var(--accent-blue);
          text-align: left;
        }

        .date-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .date-input {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          padding: 8px;
          color: var(--text-secondary);
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          width: 100%;
          text-align: center;
        }

        .date-input:focus {
          outline: none;
          background: rgba(255,255,255,0.05);
          border-color: var(--accent-blue);
        }

        .date-icon {
          position: absolute;
          right: 12px;
          opacity: 0.3;
          pointer-events: none;
        }

        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          opacity: 0;
          transition: all 0.2s;
          padding: 4px;
          border-radius: 4px;
        }

        .row-hover:hover .icon-btn {
          opacity: 0.5;
        }

        .icon-btn:hover {
          opacity: 1 !important;
          background: rgba(255,255,255,0.05);
        }

        .icon-btn.delete:hover {
          color: var(--accent-red);
          background: rgba(255, 77, 106, 0.1);
        }

        .saving-indicator {
          position: absolute;
          top: 4px;
          right: 4px;
          color: var(--accent-blue);
          opacity: 0.8;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Scrollbar Profissional */
        .checklist-grid-wrapper::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .checklist-grid-wrapper::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
        }
        .checklist-grid-wrapper::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .checklist-grid-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  )
}
