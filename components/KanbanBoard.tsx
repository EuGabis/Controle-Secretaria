'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Tarefa, StatusTarefa } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { format, isAfter, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Clock, ChevronRight, GripVertical, Edit } from 'lucide-react'

const PRIORIDADE_CONFIG = {
  baixa:   { label: 'Baixa',   color: '#10d98c', bg: 'rgba(16,217,140,0.12)'  },
  media:   { label: 'Média',   color: '#4f7cff', bg: 'rgba(79,124,255,0.12)'  },
  alta:    { label: 'Alta',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  urgente: { label: 'Urgente', color: '#ff4d6a', bg: 'rgba(255,77,106,0.12)'  },
}

interface KanbanProps {
  tarefas: Tarefa[]
  isAdmin?: boolean
  onUpdate?: () => void
  onEdit?: (tarefa: Tarefa) => void
}

const COLUMNS: { id: StatusTarefa; label: string; emoji: string; color: string }[] = [
  { id: 'a_fazer', label: 'A Fazer', emoji: '📋', color: 'var(--text-secondary)' },
  { id: 'fazendo', label: 'Fazendo', emoji: '🔄', color: 'var(--accent-blue)' },
  { id: 'feito',   label: 'Feito',   emoji: '✅', color: 'var(--accent-green)' },
]

function getProgresso(status: StatusTarefa, current: number): number {
  if (status === 'a_fazer') return 0
  if (status === 'feito') return 100
  return current || 50
}

function TarefaCard({ tarefa, isAdmin, onStatusChange, onProgressChange, onDragStart, onDelete, onEdit }: {
  tarefa: Tarefa
  isAdmin: boolean
  onStatusChange: (id: string, status: StatusTarefa, novaObs?: string) => void
  onProgressChange: (id: string, progress: number) => void
  onDragStart: (id: string) => void
  onDelete: (id: string) => void
  onEdit?: (tarefa: Tarefa) => void
}) {
  const [expandido, setExpandido] = useState(false)
  const [obs, setObs] = useState(tarefa.observacao || '')
  const [dragging, setDragging] = useState(false)
  const supabase = createClient()
  const hoje = new Date()
  const atrasada = (tarefa.tipo === 'normal' || !tarefa.tipo) && tarefa.status !== 'feito' && isAfter(hoje, parseISO(tarefa.data_limite))

  // ... (keeping the rest the same for context replacement)
  const saveObs = async () => {
    await supabase.from('tarefas').update({ observacao: obs }).eq('id', tarefa.id)
  }

  const progresso = getProgresso(tarefa.status, tarefa.progresso)
  const progressColor = progresso === 100 ? 'var(--accent-green)'
    : progresso > 0 ? 'linear-gradient(90deg, #4f7cff, #8b5cf6)'
    : 'var(--text-muted)'

  return (
    <div
      className={`kanban-card ${atrasada ? 'atrasado' : ''}`}
      style={{
        marginBottom: '10px',
        cursor: 'grab',
        opacity: dragging ? 0.4 : 1,
        transform: dragging ? 'scale(0.97)' : 'scale(1)',
        transition: 'opacity 0.15s, transform 0.15s',
      }}
      draggable
      onDragStart={e => {
        setDragging(true)
        onDragStart(tarefa.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragEnd={() => setDragging(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <GripVertical size={14} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px', lineHeight: 1.3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
            <span>{tarefa.titulo}</span>
            {tarefa.tipo && tarefa.tipo !== 'normal' && (
              <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: 'var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginTop: '1px' }}>
                {tarefa.tipo === 'diaria' ? '🔄 Diária' :
                 tarefa.tipo === 'semanal' ? '📅 Semanal' :
                 tarefa.tipo === 'mensal' ? '🗓️ Mensal' :
                 tarefa.tipo === 'rotativa' ? '🔁 Rotativa' : tarefa.tipo}
              </span>
            )}
          </div>

          {/* Priority badge */}
          {(() => {
            const p = PRIORIDADE_CONFIG[tarefa.prioridade ?? 'media']
            return (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '6px', padding: '2px 8px', borderRadius: '20px', background: p.bg, border: `1px solid ${p.color}44` }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', fontWeight: '700', color: p.color }}>{p.label}</span>
              </div>
            )
          })()}

          {/* Assigned user — admin only */}
          {isAdmin && tarefa.usuario && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f7cff, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', fontWeight: '700', color: '#fff', flexShrink: 0,
              }}>
                {tarefa.usuario.nome.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
                {tarefa.usuario.nome}
              </span>
            </div>
          )}

          {/* Progress bar */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Progresso</span>
              <span style={{ fontSize: '11px', fontWeight: '600', color: progresso === 100 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                {progresso}%
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progresso}%`, background: progressColor }} />
            </div>
            {tarefa.status === 'fazendo' && (
              <input
                type="range" min={1} max={99}
                value={progresso}
                onChange={e => onProgressChange(tarefa.id, Number(e.target.value))}
                style={{ width: '100%', marginTop: '6px', accentColor: '#4f7cff', cursor: 'pointer' }}
              />
            )}
          </div>

          {/* Date (Fix: Always show for all types) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            {atrasada ? (
              <Clock size={12} color="var(--accent-red)" />
            ) : (
              <Calendar size={12} color="var(--text-muted)" />
            )}
            <span style={{ fontSize: '11px', color: atrasada ? 'var(--accent-red)' : 'var(--text-muted)' }}>
              {format(parseISO(tarefa.data_limite), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
              {atrasada && ' • Atrasada'}
            </span>
          </div>

          {/* Expand */}
          <button
            onClick={() => setExpandido(!expandido)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent-blue)', fontSize: '11px', padding: 0,
              display: 'flex', alignItems: 'center', gap: '2px', fontFamily: 'Inter, sans-serif',
            }}
          >
            <ChevronRight size={12} style={{ transform: expandido ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
            {expandido ? 'Fechar detalhes' : 'Ver detalhes'}
          </button>

          {expandido && (
            <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              {tarefa.descricao && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {tarefa.descricao}
                </p>
              )}
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Observação
              </label>
              <textarea
                className="input-field"
                style={{ fontSize: '12px', minHeight: '70px', resize: 'vertical', whiteSpace: 'pre-wrap' }}
                placeholder="Adicione uma observação..."
                value={obs}
                onChange={e => setObs(e.target.value)}
                onBlur={saveObs}
              />
              {isAdmin && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(tarefa)}
                      style={{ flex: '1 1 45%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px', fontSize: '11px', fontWeight: '600', background: 'rgba(79,124,255,0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(79,124,255,0.3)', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      <Edit size={12} /> Editar
                    </button>
                  )}
                  {tarefa.status !== 'cancelada' && (
                    <button
                      onClick={async () => {
                        const motivo = prompt('Deseja CANCELAR esta tarefa?\n\n(Opcional) Digite o motivo do cancelamento abaixo:')
                        if (motivo !== null) {
                          const novaObs = motivo.trim() 
                            ? `${tarefa.observacao ? tarefa.observacao + '\n\n' : ''}🚫 Cancelada: ${motivo.trim()}`
                            : tarefa.observacao;

                          const updates: any = { status: 'cancelada' }
                          if (motivo.trim()) updates.observacao = novaObs;

                          const { error } = await supabase.from('tarefas').update(updates).eq('id', tarefa.id)
                          if (error) {
                            alert(`Erro ao cancelar: ${error.message} \nO banco de dados precisa aceitar o status 'cancelada'.`)
                            return
                          }
                          
                          if (motivo.trim()) setObs(novaObs as string);
                          onStatusChange(tarefa.id, 'cancelada', motivo.trim() ? (novaObs as string) : undefined)
                        }
                      }}
                      style={{ flex: '1 1 45%', padding: '6px', fontSize: '11px', fontWeight: '600', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      🚫 Cancelar
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (confirm('Atenção: A EXCLUSÃO é permanente! Deseja remover do banco de dados?')) {
                        const { error } = await supabase.from('tarefas').delete().eq('id', tarefa.id)
                        if (error) {
                          alert(`Erro ao excluir: ${error.message}`)
                          return
                        }
                        onDelete(tarefa.id)
                      }
                    }}
                    style={{ flex: '1 1 100%', padding: '6px', fontSize: '11px', fontWeight: '600', background: 'rgba(255,77,106,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(255,77,106,0.3)', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Status buttons (user only) */}
          {!isAdmin && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '10px', flexWrap: 'wrap' }}>
              {COLUMNS.map(col => (
                <button
                  key={col.id}
                  onClick={() => onStatusChange(tarefa.id, col.id)}
                  style={{
                    fontSize: '10px', padding: '4px 8px',
                    borderRadius: '6px', cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif', fontWeight: '600',
                    border: tarefa.status === col.id ? `1px solid ${col.color}` : '1px solid var(--border)',
                    background: tarefa.status === col.id ? `${col.color}22` : 'transparent',
                    color: tarefa.status === col.id ? col.color : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {col.emoji} {col.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function KanbanBoard({ tarefas: initialTarefas, isAdmin = false, onUpdate, onEdit }: KanbanProps) {
  const [tarefas, setTarefas] = useState(initialTarefas)
  const [dragOverCol, setDragOverCol] = useState<StatusTarefa | null>(null)
  const dragIdRef = useRef<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    setTarefas(initialTarefas)
  }, [initialTarefas])

  const handleStatusChange = useCallback(async (id: string, newStatus: StatusTarefa, novaObs?: string) => {
    const tarefa = tarefas.find(t => t.id === id)
    if (!tarefa || tarefa.status === newStatus) return

    const newProgress = newStatus === 'a_fazer' ? 0 : newStatus === 'feito' ? 100 : tarefa.progresso || 50
    
    // Feature: 'Andar com a data' ao mover para 'Fazendo'
    let newDataLimite = tarefa.data_limite
    if (newStatus === 'fazendo') {
      const hojeStr = new Date().toISOString().split('T')[0]
      // Se estiver atrasada ou sem data, damos 3 dias de prazo novo
      if (isAfter(new Date(), parseISO(tarefa.data_limite)) || !tarefa.data_limite) {
        const novaData = new Date()
        novaData.setDate(novaData.getDate() + 3)
        newDataLimite = novaData.toISOString().split('T')[0]
      }
    }

    await supabase.from('follow_up_log').insert({
      tarefa_id: id,
      usuario_id: tarefa.usuario_id,
      status_anterior: tarefa.status,
      status_novo: newStatus,
    })

    const { error } = await supabase.from('tarefas').update({ 
      status: newStatus, 
      progresso: newProgress,
      data_limite: newDataLimite 
    }).eq('id', id)

    if (error) {
      alert(`Erro ao alterar status da tarefa: ${error.message}\nVerifique as restrições (constraints) do seu banco Supabase.`)
      return
    }

    setTarefas(prev => prev.map(t =>
      t.id === id ? { ...t, status: newStatus, progresso: newProgress, data_limite: newDataLimite, ...(novaObs !== undefined ? { observacao: novaObs } : {}) } : t
    ))
    onUpdate?.()
  }, [tarefas, supabase, onUpdate])

  const handleProgressChange = useCallback(async (id: string, progress: number) => {
    await supabase.from('tarefas').update({ progresso: progress }).eq('id', id)
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, progresso: progress } : t))
  }, [supabase])

  const handleDrop = useCallback((colId: StatusTarefa) => {
    if (dragIdRef.current) {
      handleStatusChange(dragIdRef.current, colId)
      dragIdRef.current = null
    }
    setDragOverCol(null)
  }, [handleStatusChange])

  const handleDelete = useCallback((id: string) => {
    setTarefas(prev => prev.filter(t => t.id !== id))
    if (onUpdate) onUpdate()
  }, [onUpdate])

  const visibleColumns = isAdmin 
    ? [...COLUMNS, { id: 'cancelada', label: 'Canceladas', emoji: '🚫', color: 'var(--accent-red)' } as const] 
    : COLUMNS

  return (
    <div className="kanban-board" style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', minHeight: '60vh' }}>
      {visibleColumns.map(col => {
        const colTarefas = tarefas.filter(t => t.status === col.id)
        const isOver = dragOverCol === col.id
        return (
          <div
            key={col.id}
            className="kanban-col"
            onDragOver={e => { e.preventDefault(); setDragOverCol(col.id as StatusTarefa) }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => handleDrop(col.id as StatusTarefa)}
            style={{
              flex: '1 1 300px',
              minWidth: '300px',
              background: isOver ? `${col.color}08` : 'rgba(255,255,255,0.02)',
              border: isOver ? `2px dashed ${col.color}` : '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              transition: 'background 0.15s, border 0.15s',
            }}
          >
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '14px', padding: '0 4px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{col.emoji}</span>
                <span style={{ fontWeight: '700', fontSize: '14px', color: col.color }}>{col.label}</span>
              </div>
              <span style={{
                background: `${col.color}18`, color: col.color,
                fontSize: '11px', fontWeight: '700',
                padding: '2px 8px', borderRadius: '20px',
              }}>
                {colTarefas.length}
              </span>
            </div>

            {/* Column body */}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100px' }}>
              {colTarefas.map(t => (
                <TarefaCard
                  key={t.id}
                  tarefa={t}
                  isAdmin={isAdmin}
                  onStatusChange={handleStatusChange}
                  onProgressChange={handleProgressChange}
                  onDragStart={id => { dragIdRef.current = id }}
                  onDelete={handleDelete}
                  onEdit={onEdit}
                />
              ))}
              
              {colTarefas.length === 0 && (
                <div style={{
                  textAlign: 'center', padding: '32px 16px',
                  color: isOver ? col.color : 'var(--text-muted)',
                  fontSize: '13px', transition: 'color 0.15s',
                  border: '1px dashed var(--border)', borderRadius: '12px'
                }}>
                  {isOver ? `Soltar aqui → ${col.label}` : 'Vazio'}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
