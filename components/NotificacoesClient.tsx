'use client'

import { useState } from 'react'
import { Notificacao, RespostaNotificacao, Usuario } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Bell, Send, Check, Users, User, Loader2, Plus, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  notificacoes: Notificacao[]
  respostas: RespostaNotificacao[]
  usuarios: Usuario[]
  isAdmin: boolean
  userId: string
}

export default function NotificacoesClient({ notificacoes: initial, respostas: initialRespostas, usuarios, isAdmin, userId }: Props) {
  const [notifs, setNotifs] = useState(initial)
  const [respostas, setRespostas] = useState<RespostaNotificacao[]>(initialRespostas)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ mensagem: '', tipo: 'individual', usuario_id: '' })
  const supabase = createClient()

  const markRead = async (id: string) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload: Record<string, unknown> = { mensagem: form.mensagem, tipo: form.tipo }
    if (form.tipo === 'individual') payload.usuario_id = form.usuario_id
    const { data } = await supabase.from('notificacoes').insert(payload).select().single()
    if (data) setNotifs(prev => [data, ...prev])
    setShowModal(false)
    setForm({ mensagem: '', tipo: 'individual', usuario_id: '' })
    setLoading(false)
  }

  const handleReply = async (notifId: string) => {
    const texto = replyText[notifId]?.trim()
    if (!texto) return
    setSendingId(notifId)

    const { data } = await supabase
      .from('respostas_notificacoes')
      .insert({ notificacao_id: notifId, de_usuario_id: userId, mensagem: texto })
      .select('*, autor:usuarios!de_usuario_id(id, nome, perfil)')
      .single()

    if (data) {
      setRespostas(prev => [...prev, data])
      // Marcar notificação como lida quando o usuário responde
      const notif = notifs.find(n => n.id === notifId)
      if (notif && !notif.lida && !isAdmin) markRead(notifId)
    }
    setReplyText(prev => ({ ...prev, [notifId]: '' }))
    setSendingId(null)
  }

  const unread = notifs.filter(n => !n.lida).length
  const myNotifs = !isAdmin ? notifs.filter(n => n.tipo === 'coletiva' || n.usuario_id === userId) : notifs

  return (
    <div style={{ padding: '32px', maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Bell size={26} color="var(--accent-blue)" />
            <span className="text-gradient">Notificações</span>
            {unread > 0 && (
              <span style={{ background: 'var(--accent-red)', color: 'white', fontSize: '13px', fontWeight: '700', borderRadius: '20px', padding: '2px 10px' }}>
                {unread} nova{unread > 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {isAdmin ? 'Gerencie e envie mensagens para a equipe' : 'Mensagens do administrador'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Enviar Alerta
          </button>
        )}
      </div>

      {/* Notification list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {myNotifs.length === 0 ? (
          <div className="glass" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Bell size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
            <p>Nenhuma notificação</p>
          </div>
        ) : myNotifs.map(n => {
          const isExpanded = expandedId === n.id
          const threadRespostas = respostas.filter(r => r.notificacao_id === n.id)
          const replyCount = threadRespostas.length

          return (
            <div key={n.id} className="glass" style={{
              borderLeft: n.lida ? '3px solid var(--border)' : '3px solid var(--accent-blue)',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}>
              {/* Notification header */}
              <div
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer' }}
                onClick={() => {
                  setExpandedId(isExpanded ? null : n.id)
                  if (!n.lida && !isAdmin) markRead(n.id)
                }}
              >
                <div style={{
                  width: '36px', height: '36px', flexShrink: 0,
                  background: n.tipo === 'coletiva' ? 'rgba(139,92,246,0.15)' : 'rgba(79,124,255,0.15)',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {n.tipo === 'coletiva' ? <Users size={16} color="#8b5cf6" /> : <User size={16} color="#4f7cff" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, marginBottom: '6px' }}>{n.mensagem}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${n.tipo === 'coletiva' ? 'badge-blue' : 'badge-gray'}`}>
                      {n.tipo === 'coletiva' ? '📢 Para todos' : '👤 Individual'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {format(parseISO(n.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                    </span>
                    {replyCount > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--accent-blue)' }}>
                        <MessageSquare size={11} />
                        {replyCount} resposta{replyCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {!n.lida && (
                    <button
                      onClick={e => { e.stopPropagation(); markRead(n.id) }}
                      style={{
                        background: 'rgba(16,217,140,0.1)', border: '1px solid rgba(16,217,140,0.3)',
                        borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'var(--accent-green)',
                        display: 'flex', alignItems: 'center',
                      }}
                      title="Marcar como lida"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>
              </div>

              {/* Chat thread — expanded */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
                  {/* Messages */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                    {threadRespostas.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '16px 0' }}>
                        Nenhuma resposta ainda. Seja o primeiro a responder!
                      </div>
                    ) : threadRespostas.map(r => {
                      const isMe = r.de_usuario_id === userId
                      const isAdminMsg = r.autor?.perfil === 'admin' || r.autor?.perfil === 'master'
                      return (
                        <div key={r.id} style={{
                          display: 'flex',
                          flexDirection: isMe ? 'row-reverse' : 'row',
                          alignItems: 'flex-end',
                          gap: '8px',
                        }}>
                          {/* Avatar */}
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                            background: isAdminMsg
                              ? 'linear-gradient(135deg, #ff4d6a, #8b5cf6)'
                              : 'linear-gradient(135deg, #4f7cff, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: '700', color: '#fff',
                          }}>
                            {(r.autor?.nome ?? 'A').charAt(0).toUpperCase()}
                          </div>
                          {/* Bubble */}
                          <div style={{ maxWidth: '75%' }}>
                            <div style={{
                              padding: '10px 14px',
                              borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              background: isMe
                                ? 'linear-gradient(135deg, rgba(79,124,255,0.25), rgba(139,92,246,0.2))'
                                : 'rgba(255,255,255,0.05)',
                              border: isMe ? '1px solid rgba(79,124,255,0.3)' : '1px solid var(--border)',
                              fontSize: '13px',
                              lineHeight: 1.5,
                            }}>
                              {r.mensagem}
                            </div>
                            <div style={{
                              fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px',
                              textAlign: isMe ? 'right' : 'left',
                            }}>
                              {isMe ? 'Você' : (r.autor?.nome ?? 'Admin')} · {format(parseISO(r.created_at), 'HH:mm', { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Reply box */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <textarea
                      className="input-field"
                      rows={2}
                      placeholder="Digite sua resposta..."
                      style={{ flex: 1, resize: 'none', fontSize: '13px' }}
                      value={replyText[n.id] ?? ''}
                      onChange={e => setReplyText(prev => ({ ...prev, [n.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleReply(n.id)
                        }
                      }}
                    />
                    <button
                      onClick={() => handleReply(n.id)}
                      disabled={sendingId === n.id || !replyText[n.id]?.trim()}
                      className="btn-primary"
                      style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                    >
                      {sendingId === n.id
                        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Send size={14} />
                      }
                      Enviar
                    </button>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Enter para enviar · Shift+Enter para nova linha
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Send notification modal (admin only) */}
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
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Enviar Alerta</h2>
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Tipo de envio</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ v: 'individual', l: '👤 Individual' }, { v: 'coletiva', l: '📢 Para todos' }].map(({ v, l }) => (
                    <button key={v} type="button" onClick={() => setForm(f => ({ ...f, tipo: v }))}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: '500',
                        border: form.tipo === v ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                        background: form.tipo === v ? 'rgba(79,124,255,0.12)' : 'transparent',
                        color: form.tipo === v ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {form.tipo === 'individual' && (
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Colaborador *</label>
                  <select className="input-field" required value={form.usuario_id} onChange={e => setForm(f => ({ ...f, usuario_id: e.target.value }))}>
                    <option value="" style={{ background: '#12121a', color: '#f0f0f8' }}>Selecionar...</option>
                    {usuarios.map(u => <option key={u.id} value={u.id} style={{ background: '#12121a', color: '#f0f0f8' }}>{u.nome}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Mensagem *</label>
                <textarea className="input-field" rows={4} required placeholder="Escreva o alerta..." style={{ resize: 'vertical' }}
                  value={form.mensagem} onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                  {loading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
