'use client'

import { useState } from 'react'
import { Usuario, Perfil } from '@/lib/types'
import {
  Users, Plus, Pencil, Trash2, X, Loader2,
  Shield, User, Search, CheckCircle, KeyRound, Clock
} from 'lucide-react'

interface Props {
  usuarios: Usuario[]
  currentPerfil: Perfil
}

export default function UsuariosClient({ usuarios: initial, currentPerfil }: Props) {
  const [usuarios, setUsuarios] = useState(initial)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'usuario' as Perfil })

  const [resetTarget, setResetTarget] = useState<Usuario | null>(null)
  const [resetSenha, setResetSenha] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  const openReset = (u: Usuario) => {
    setResetTarget(u)
    setResetSenha('')
    setResetError('')
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    setResetLoading(true)
    setResetError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetTarget.id, novaSenha: resetSenha }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResetTarget(null)
      showSuccess(`Senha de ${resetTarget.nome} redefinida com sucesso!`)
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setResetLoading(false)
    }
  }

  const filtered = usuarios.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditingUser(null)
    setForm({ nome: '', email: '', senha: '', perfil: 'usuario' })
    setErrorMsg('')
    setShowModal(true)
  }

  const openEdit = (u: Usuario) => {
    setEditingUser(u)
    setForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil })
    setErrorMsg('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      if (editingUser) {
        // EDIT
        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: editingUser.id, nome: form.nome, perfil: form.perfil }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setUsuarios(prev => prev.map(u =>
          u.id === editingUser.id ? { ...u, nome: form.nome, perfil: form.perfil } : u
        ))
        showSuccess('Usuário atualizado com sucesso!')
      } else {
        // CREATE
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        // Add to list (trigger will create the row, fetch updated)
        setUsuarios(prev => [...prev, {
          id: data.user.id,
          nome: form.nome,
          email: form.email,
          perfil: form.perfil,
          created_at: new Date().toISOString(),
        }])
        showSuccess('Usuário criado com sucesso!')
      }
      setShowModal(false)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const toggleBancoHoras = async (u: Usuario) => {
    const novoValor = !u.banco_horas_liberado
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, banco_horas_liberado: novoValor } : x))
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, banco_horas_liberado: novoValor }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showSuccess(`Banco de Horas ${novoValor ? 'liberado' : 'bloqueado'} para ${u.nome}.`)
    } catch (err: unknown) {
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, banco_horas_liberado: !novoValor } : x))
      alert(err instanceof Error ? err.message : 'Erro ao alterar permissão')
    }
  }

  const handleDelete = async (u: Usuario) => {
    if (!confirm(`Tem certeza que quer excluir "${u.nome}"? Esta ação não pode ser desfeita.`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setUsuarios(prev => prev.filter(x => x.id !== u.id))
      showSuccess('Usuário excluído.')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setLoading(false)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const masters = filtered.filter(u => u.perfil === 'master')
  const admins = filtered.filter(u => u.perfil === 'admin')
  const colaboradores = filtered.filter(u => u.perfil === 'usuario')

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={26} color="var(--accent-blue)" /> <span className="text-gradient">Usuários</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div style={{
          background: 'rgba(16,217,140,0.1)', border: '1px solid rgba(16,217,140,0.3)',
          borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
          color: 'var(--accent-green)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '28px' }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          className="input-field"
          style={{ paddingLeft: '40px' }}
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Masters */}
      {masters.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Shield size={16} color="var(--accent-purple)" />
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-purple)', letterSpacing: '0.05em' }}>
              DIRECTORIA (MASTERS)
            </h2>
            <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)' }}>{masters.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {masters.map(u => <UserRow key={u.id} user={u} onEdit={openEdit} onDelete={handleDelete} onReset={currentPerfil === 'master' ? openReset : undefined} onToggleBH={toggleBancoHoras} />)}
          </div>
        </section>
      )}

      {/* Admins */}
      {admins.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Shield size={16} color="var(--accent-blue)" />
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-blue)', letterSpacing: '0.05em' }}>
              ADMINISTRADORES
            </h2>
            <span className="badge badge-blue">{admins.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {admins.map(u => <UserRow key={u.id} user={u} onEdit={openEdit} onDelete={handleDelete} onReset={currentPerfil === 'master' ? openReset : undefined} onToggleBH={toggleBancoHoras} />)}
          </div>
        </section>
      )}

      {/* Colaboradores */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <User size={16} color="var(--text-secondary)" />
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
            COLABORADORES
          </h2>
          <span className="badge badge-gray">{colaboradores.length}</span>
        </div>
        {colaboradores.length === 0 ? (
          <div className="glass" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhum colaborador encontrado.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {colaboradores.map(u => <UserRow key={u.id} user={u} onEdit={openEdit} onDelete={handleDelete} onReset={currentPerfil === 'master' ? openReset : undefined} onToggleBH={toggleBancoHoras} />)}
          </div>
        )}
      </section>

      {/* Modal Reset Senha */}
      {resetTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div className="glass" style={{ width: '100%', maxWidth: '420px', padding: '32px', position: 'relative' }}>
            <button onClick={() => setResetTarget(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <KeyRound size={20} color="var(--accent-yellow, #f59e0b)" />
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Redefinir Senha</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Definindo nova senha para <strong style={{ color: 'var(--text-primary)' }}>{resetTarget.nome}</strong>.
              O restante dos dados do usuário não será alterado.
            </p>
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Nova senha *</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  value={resetSenha}
                  onChange={e => setResetSenha(e.target.value)}
                  autoFocus
                />
              </div>
              {resetError && (
                <div style={{
                  background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.3)',
                  borderRadius: '8px', padding: '10px 14px', color: 'var(--accent-red)', fontSize: '13px',
                }}>
                  {resetError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setResetTarget(null)} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={resetLoading}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {resetLoading
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
                    : 'Redefinir Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div className="glass" style={{ width: '100%', maxWidth: '460px', padding: '32px', position: 'relative' }}>
            <button onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>
              {editingUser ? '✏️ Editar Usuário' : '👤 Novo Usuário'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Nome completo *</label>
                <input className="input-field" placeholder="Nome" required
                  value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>E-mail *</label>
                    <input type="email" className="input-field" placeholder="email@empresa.com" required
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Senha *</label>
                    <input type="password" className="input-field" placeholder="Mínimo 6 caracteres" required minLength={6}
                      value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Perfil *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { v: 'usuario', l: '👤 Colaborador' },
                    { v: 'admin', l: '🛡️ Admin' },
                    { v: 'master', l: '👑 Master' },
                  ].map(({ v, l }) => (
                    <button key={v} type="button" onClick={() => setForm(f => ({ ...f, perfil: v as Perfil }))}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: '500',
                        border: form.perfil === v ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                        background: form.perfil === v ? 'rgba(79,124,255,0.12)' : 'transparent',
                        color: form.perfil === v ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div style={{
                  background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.3)',
                  borderRadius: '8px', padding: '10px 14px', color: 'var(--accent-red)', fontSize: '13px',
                }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> :
                    editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function UserRow({ user, onEdit, onDelete, onReset, onToggleBH }: { user: Usuario; onEdit: (u: Usuario) => void; onDelete: (u: Usuario) => void; onReset?: (u: Usuario) => void; onToggleBH?: (u: Usuario) => void }) {
  const isAdmin = user.perfil === 'admin' || user.perfil === 'master'
  const isMaster = user.perfil === 'master'
  const bhAtivo = !!user.banco_horas_liberado
  return (
    <div className="glass" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{
        width: '44px', height: '44px', flexShrink: 0,
        background: isAdmin ? 'linear-gradient(135deg, #4f7cff22, #8b5cf622)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isAdmin ? 'rgba(79,124,255,0.3)' : 'var(--border)'}`,
        borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', fontWeight: '700',
        color: isAdmin ? '#4f7cff' : 'var(--text-secondary)',
      }}>
        {user.nome.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>{user.nome}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email}
        </div>
      </div>
      <span className={`badge ${isMaster ? 'badge-blue' : isAdmin ? 'badge-blue' : 'badge-gray'}`} style={{ flexShrink: 0, background: isMaster ? 'rgba(139,92,246,0.15)' : undefined, color: isMaster ? 'var(--accent-purple)' : undefined, border: isMaster ? '1px solid rgba(139,92,246,0.3)' : undefined }}>
        {isMaster ? '👑 Master' : isAdmin ? '🛡️ Admin' : '👤 Colaborador'}
      </span>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {onToggleBH && !isAdmin && (
          <button onClick={() => onToggleBH(user)} title={bhAtivo ? 'Bloquear Banco de Horas' : 'Liberar Banco de Horas'} style={{
            height: '34px', padding: '0 10px', borderRadius: '8px',
            background: bhAtivo ? 'rgba(16,217,140,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${bhAtivo ? 'rgba(16,217,140,0.3)' : 'var(--border)'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            color: bhAtivo ? 'var(--accent-green)' : 'var(--text-muted)',
            fontSize: '11px', fontWeight: '600', fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s',
          }}>
            <Clock size={13} /> {bhAtivo ? 'BH ON' : 'BH OFF'}
          </button>
        )}
        {onReset && (
          <button onClick={() => onReset(user)} title="Redefinir senha" style={{
            width: '34px', height: '34px', borderRadius: '8px',
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#f59e0b', transition: 'all 0.2s',
          }}>
            <KeyRound size={14} />
          </button>
        )}
        <button onClick={() => onEdit(user)} style={{
          width: '34px', height: '34px', borderRadius: '8px',
          background: 'rgba(79,124,255,0.08)', border: '1px solid rgba(79,124,255,0.2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-blue)', transition: 'all 0.2s',
        }}>
          <Pencil size={14} />
        </button>
        <button onClick={() => onDelete(user)} style={{
          width: '34px', height: '34px', borderRadius: '8px',
          background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-red)', transition: 'all 0.2s',
        }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
