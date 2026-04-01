'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { isAfter, parseISO } from 'date-fns'
import { Tarefa, TarefaTipo, PrioridadeTarefa } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import KanbanBoard from '@/components/KanbanBoard'
import { Plus, X, Loader2, ListTodo } from 'lucide-react'

interface Props {
  tarefas: Tarefa[]
  userId: string
}

type StatusFilter = 'all' | 'a_fazer' | 'fazendo' | 'feito' | 'atrasadas'

export default function UserTarefasClient({ tarefas: initialTarefas, userId }: Props) {
  const searchParams = useSearchParams()
  const [tarefas, setTarefas] = useState(initialTarefas)
  const [showModal, setShowModal] = useState(false)
  const [loading, setSaving] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>(() => (searchParams.get('status') as StatusFilter) ?? 'all')
  const [selectedTipo, setSelectedTipo] = useState<string>(() => searchParams.get('tipo') ?? 'all')
  
  const [form, setForm] = useState({ 
    titulo: '', 
    descricao: '', 
    data_limite: new Date().toISOString().slice(0, 10), 
    usuario_id: userId, 
    tipo: 'normal' as TarefaTipo, 
    prioridade: 'media' as PrioridadeTarefa, 
    observacao: '' 
  })
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null)
  const [createError, setCreateError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    setTarefas(initialTarefas)
  }, [initialTarefas])

  const hoje = new Date()

  const filteredTarefas = tarefas.filter(t => {
    const matchStatus = (() => {
      if (selectedStatus === 'all') return true
      if (selectedStatus === 'atrasadas') return t.status !== 'feito' && isAfter(hoje, parseISO(t.data_limite))
      return t.status === selectedStatus
    })()
    const matchTipo = selectedTipo === 'all' || t.tipo === selectedTipo || (!t.tipo && selectedTipo === 'normal')
    return matchStatus && matchTipo
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setCreateError('')

    if (editingTarefa) {
      // UPDATE
      const { data, error } = await supabase.from('tarefas').update({
        ...form,
        usuario_id: userId // Garantir que não mude o dono
      }).eq('id', editingTarefa.id).select().single()

      if (error) {
        setCreateError(`Erro ao atualizar: ${error.message}`)
        setSaving(false)
        return
      }
      setTarefas(prev => prev.map(t => t.id === editingTarefa.id ? { ...t, ...data } : t))
    } else {
      // CREATE
      const { data, error } = await supabase.from('tarefas').insert({
        ...form,
        status: 'a_fazer',
        progresso: 0,
        usuario_id: userId,
        criado_por: userId,
      }).select().single()

      if (error) {
        setCreateError(`Erro ao criar: ${error.message}`)
        setSaving(false)
        return
      }
      if (data) setTarefas(prev => [...prev, data])
    }

    handleCloseModal()
    setSaving(false)
  }

  const handleEdit = (tarefa: Tarefa) => {
    setEditingTarefa(tarefa)
    setForm({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || '',
      data_limite: tarefa.data_limite,
      usuario_id: userId,
      tipo: tarefa.tipo || 'normal',
      prioridade: tarefa.prioridade || 'media',
      observacao: tarefa.observacao || ''
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTarefa(null)
    setForm({ 
        titulo: '', 
        descricao: '', 
        data_limite: new Date().toISOString().slice(0, 10), 
        usuario_id: userId, 
        tipo: 'normal', 
        prioridade: 'media', 
        observacao: '' 
    })
    setCreateError('')
  }

  return (
    <div style={{ padding: '0px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <ListTodo size={16} />
            <span style={{ fontSize: '13px', fontWeight: '600' }}>QUADRO DE TAREFAS</span>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}>
          <Plus size={18} /> Nova Tarefa
        </button>
      </div>

      {/* Filtros Simplificados */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select 
            className="input-field" 
            style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as StatusFilter)}
        >
            <option value="all">Todos os Status</option>
            <option value="a_fazer">A Fazer</option>
            <option value="fazendo">Fazendo</option>
            <option value="feito">Feitas</option>
            <option value="atrasadas">Atrasadas ⚠️</option>
        </select>

        <select 
            className="input-field" 
            style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
            value={selectedTipo}
            onChange={e => setSelectedTipo(e.target.value)}
        >
            <option value="all">Todos os Tipos</option>
            <option value="normal">Normal</option>
            <option value="diaria">Recorrente Diária</option>
            <option value="semanal">Recorrente Semanal</option>
            <option value="mensal">Recorrente Mensal</option>
            <option value="rotativa">Rotativa</option>
        </select>
      </div>

      <KanbanBoard 
        tarefas={filteredTarefas} 
        isAdmin={false} 
        onEdit={handleEdit} 
        onUpdate={async () => {
           // Recarrega se necessário via prop/initial
        }}
      />

      {/* Modal de Criação / Edição */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div className="glass" style={{ width: '100%', maxWidth: '480px', padding: '32px', position: 'relative' }}>
            <button onClick={handleCloseModal} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '24px' }}>
              {editingTarefa ? 'Editar minha tarefa' : '🎁 Criar nova tarefa'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>O que precisa ser feito? *</label>
                <input className="input-field" placeholder="Ex: Enviar relatório, Responder e-mail..." required
                  value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Detalhes (Opcional)</label>
                <textarea className="input-field" placeholder="Mais informações..." rows={3} style={{ resize: 'vertical' }}
                  value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Tipo *</label>
                  <select className="input-field" required value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TarefaTipo }))}>
                    <option value="normal">Normal</option>
                    <option value="diaria">Recorrente Diária</option>
                    <option value="semanal">Recorrente Semanal</option>
                    <option value="mensal">Recorrente Mensal</option>
                    <option value="rotativa">Rotativa</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Prioridade *</label>
                  <select className="input-field" required value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as PrioridadeTarefa }))}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Data Limite / Prazo *</label>
                <input type="date" className="input-field" required
                  value={form.data_limite} onChange={e => setForm(f => ({ ...f, data_limite: e.target.value }))} />
              </div>

              {createError && (
                <div style={{ background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.3)', borderRadius: '8px', padding: '10px 14px', color: 'var(--accent-red)', fontSize: '12px' }}>
                   {createError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={handleCloseModal} style={{ flex: 1 }}>Sair</button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : (editingTarefa ? 'Salvar' : 'Adicionar Tarefa')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
