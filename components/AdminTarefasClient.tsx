'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { isAfter, parseISO } from 'date-fns'
import { Usuario, Tarefa, TarefaTipo, PrioridadeTarefa } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import KanbanBoard from '@/components/KanbanBoard'
import { Plus, X, Loader2 } from 'lucide-react'

interface Props {
  usuarios: Usuario[]
  tarefas: Tarefa[]
  adminId: string
}

type StatusFilter = 'all' | 'a_fazer' | 'fazendo' | 'feito' | 'atrasadas'

export default function AdminTarefasClient({ usuarios, tarefas: initialTarefas, adminId }: Props) {
  const searchParams = useSearchParams()
  const [tarefas, setTarefas] = useState(initialTarefas)
  const [showModal, setShowModal] = useState(false)
  const [loading, setSaving] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>(() => searchParams.get('usuario') ?? 'all')
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>(() => (searchParams.get('status') as StatusFilter) ?? 'all')
  const [selectedTipo, setSelectedTipo] = useState<string>(() => searchParams.get('tipo') ?? 'all')
  const [form, setForm] = useState({ titulo: '', descricao: '', data_limite: '', usuario_id: '', tipo: 'normal' as TarefaTipo, prioridade: 'media' as PrioridadeTarefa, observacao: '' })
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null)
  const [createError, setCreateError] = useState('')
  const supabase = createClient()

  // Sync whenever URL params change (e.g. browser back/forward)
  useEffect(() => {
    const u = searchParams.get('usuario') ?? 'all'
    const s = (searchParams.get('status') as StatusFilter) ?? 'all'
    const t = searchParams.get('tipo') ?? 'all'
    setSelectedUser(u)
    setSelectedStatus(s)
    setSelectedTipo(t)
  }, [searchParams])

  const hoje = new Date()

  const filteredTarefas = tarefas.filter(t => {
    const matchUser = selectedUser === 'all' || t.usuario_id === selectedUser
    const matchStatus = (() => {
      if (selectedStatus === 'all') return true
      if (selectedStatus === 'atrasadas') return t.status !== 'feito' && isAfter(hoje, parseISO(t.data_limite))
      return t.status === selectedStatus
    })()
    const matchTipo = selectedTipo === 'all' || t.tipo === selectedTipo || (!t.tipo && selectedTipo === 'normal')
    return matchUser && matchStatus && matchTipo
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setCreateError('')

    if (editingTarefa) {
      // UPDATE
      const { data, error } = await supabase.from('tarefas').update({
        ...form,
      }).eq('id', editingTarefa.id).select('*, usuario:usuarios!usuario_id(*)').single()

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
        criado_por: adminId,
      }).select('*, usuario:usuarios!usuario_id(*)').single()

      if (error) {
        setCreateError(`Erro: ${error.message} (code: ${error.code})`)
        setSaving(false)
        return
      }

      if (data) {
        setTarefas(prev => [...prev, data])
      } else {
        const responsavel = usuarios.find(u => u.id === form.usuario_id) || null
        setTarefas(prev => [...prev, {
          id: crypto.randomUUID(),
          titulo: form.titulo,
          descricao: form.descricao,
          data_limite: form.data_limite,
          status: 'a_fazer',
          progresso: 0,
          observacao: form.observacao || null,
          usuario_id: form.usuario_id,
          criado_por: adminId,
          created_at: new Date().toISOString(),
          usuario: responsavel,
        } as Tarefa])
      }
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
      usuario_id: tarefa.usuario_id,
      tipo: tarefa.tipo || 'normal',
      prioridade: tarefa.prioridade || 'media',
      observacao: tarefa.observacao || ''
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTarefa(null)
    setForm({ titulo: '', descricao: '', data_limite: '', usuario_id: '', tipo: 'normal', prioridade: 'media', observacao: '' })
    setCreateError('')
  }

  const statusOptions: { id: StatusFilter; label: string }[] = [
    { id: 'all',       label: 'Todos'     },
    { id: 'a_fazer',   label: 'A Fazer'   },
    { id: 'fazendo',   label: 'Fazendo'   },
    { id: 'feito',     label: 'Feitas'    },
    { id: 'atrasadas', label: 'Atrasadas' },
  ]

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>Tarefas</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Gerencie e atribua tarefas aos colaboradores</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Nova Tarefa
        </button>
      </div>

      {/* Filtro por Usuário */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[{ id: 'all', nome: 'Todos' }, ...usuarios].map(u => (
          <button
            key={u.id}
            onClick={() => setSelectedUser(u.id)}
            style={{
              padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
              border: selectedUser === u.id ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
              background: selectedUser === u.id ? 'rgba(79,124,255,0.12)' : 'rgba(255,255,255,0.03)',
              color: selectedUser === u.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
            }}
          >
            {'nome' in u ? u.nome : 'Todos'}
          </button>
        ))}
      </div>

      {/* Filtro por Status */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {statusOptions.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSelectedStatus(id)}
            style={{
              padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '500',
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
              border: selectedStatus === id ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
              background: selectedStatus === id ? 'rgba(79,124,255,0.15)' : 'transparent',
              color: selectedStatus === id ? 'var(--accent-blue)' : 'var(--text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtro por Tipo */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'all',      label: 'Todos os Tipos' },
          { id: 'normal',   label: 'Normal' },
          { id: 'diaria',   label: 'Diária 🔄' },
          { id: 'semanal',  label: 'Semanal 📅' },
          { id: 'mensal',   label: 'Mensal 🗓️' },
          { id: 'rotativa', label: 'Rotativa 🔁' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSelectedTipo(id)}
            style={{
              padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '500',
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
              border: selectedTipo === id ? '1px solid var(--accent-purple)' : '1px solid var(--border)',
              background: selectedTipo === id ? 'rgba(139,92,246,0.15)' : 'transparent',
              color: selectedTipo === id ? 'var(--accent-purple)' : 'var(--text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <KanbanBoard key={`${selectedUser}-${selectedStatus}`} tarefas={filteredTarefas} isAdmin={true} onEdit={handleEdit} />

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div className="glass" style={{ width: '100%', maxWidth: '480px', padding: '32px', position: 'relative' }}>
            <button
              onClick={handleCloseModal}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>
              {editingTarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Título *</label>
                <input className="input-field" placeholder="Título da tarefa" required
                  value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Descrição</label>
                <textarea className="input-field" placeholder="Descreva a tarefa..." rows={3} style={{ resize: 'vertical' }}
                  value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Tipo *</label>
                  <select className="input-field" required
                    value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TarefaTipo }))}>
                    <option value="normal" style={{ background: '#12121a', color: '#f0f0f8' }}>Normal</option>
                    <option value="diaria" style={{ background: '#12121a', color: '#f0f0f8' }}>Recorrente Diária</option>
                    <option value="semanal" style={{ background: '#12121a', color: '#f0f0f8' }}>Recorrente Semanal</option>
                    <option value="mensal" style={{ background: '#12121a', color: '#f0f0f8' }}>Recorrente Mensal</option>
                    <option value="rotativa" style={{ background: '#12121a', color: '#f0f0f8' }}>Rotativa</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Prioridade *</label>
                  <select className="input-field" required
                    value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as PrioridadeTarefa }))}>
                    <option value="baixa" style={{ background: '#12121a', color: '#f0f0f8' }}>Baixa 🔵</option>
                    <option value="media" style={{ background: '#12121a', color: '#f0f0f8' }}>Média 🟣</option>
                    <option value="alta" style={{ background: '#12121a', color: '#f0f0f8' }}>Alta 🟠</option>
                    <option value="urgente" style={{ background: '#12121a', color: '#f0f0f8' }}>Urgente 🔴</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Responsável *</label>
                  <select className="input-field" required
                    value={form.usuario_id} onChange={e => setForm(f => ({ ...f, usuario_id: e.target.value }))}>
                    <option value="" style={{ background: '#12121a', color: '#f0f0f8' }}>Selecionar...</option>
                    {usuarios.map(u => <option key={u.id} value={u.id} style={{ background: '#12121a', color: '#f0f0f8' }}>{u.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Data Limite *</label>
                  <input type="date" className="input-field" required
                    value={form.data_limite} onChange={e => setForm(f => ({ ...f, data_limite: e.target.value }))} />
                </div>
              </div>
              {createError && (
                <div style={{
                  background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.3)',
                  borderRadius: '8px', padding: '10px 14px', color: 'var(--accent-red)', fontSize: '12px',
                }}>
                  {createError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={handleCloseModal} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : (editingTarefa ? 'Salvar Alterações' : 'Criar Tarefa')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
