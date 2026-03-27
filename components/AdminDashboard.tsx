'use client'

import { Usuario, Tarefa } from '@/lib/types'
import { Users, CheckCircle, AlertTriangle, ListTodo, LayoutGrid, PieChart as PieChartIcon } from 'lucide-react'
import { isAfter, parseISO } from 'date-fns'
import Link from 'next/link'
import { useState } from 'react'
import AnalyticsDashboard from './AnalyticsDashboard'

interface Props {
  usuarios: Usuario[]
  tarefas: Tarefa[]
}

function getStats(userId: string, tarefas: Tarefa[]) {
  const userTarefas = tarefas.filter(t => t.usuario_id === userId)
  const hoje = new Date()
  return {
    total: userTarefas.length,
    a_fazer: userTarefas.filter(t => t.status === 'a_fazer').length,
    fazendo: userTarefas.filter(t => t.status === 'fazendo').length,
    feito: userTarefas.filter(t => t.status === 'feito').length,
    atrasadas: userTarefas.filter(t =>
      t.status !== 'feito' && isAfter(hoje, parseISO(t.data_limite))
    ).length,
  }
}

export default function AdminDashboard({ usuarios, tarefas }: Props) {
  const [viewMode, setViewMode] = useState<'cards' | 'analytics'>('cards')

  const totalTarefas = tarefas.length
  const totalFeitas = tarefas.filter(t => t.status === 'feito').length
  const totalAtrasadas = tarefas.filter(t =>
    t.status !== 'feito' && isAfter(new Date(), parseISO(t.data_limite))
  ).length

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Visão geral de toda a equipe
          </p>
        </div>

        {/* Toggle Mode */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', padding: '4px' }}>
          <button 
            onClick={() => setViewMode('cards')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', 
              background: viewMode === 'cards' ? 'rgba(79,124,255,0.15)' : 'transparent',
              color: viewMode === 'cards' ? 'var(--accent-blue)' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s'
            }}
          >
            <LayoutGrid size={16} /> Painéis Individuais
          </button>
          <button 
            onClick={() => setViewMode('analytics')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', 
              background: viewMode === 'analytics' ? 'rgba(139,92,246,0.15)' : 'transparent',
              color: viewMode === 'analytics' ? 'var(--accent-purple)' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s'
            }}
          >
            <PieChartIcon size={16} /> Analytics (Gráficos)
          </button>
        </div>
      </div>

      {/* Summary Cards — clicáveis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
        {[
          { label: 'Total de Tarefas', value: totalTarefas, icon: ListTodo, color: '#4f7cff', href: '/dashboard/tarefas' },
          { label: 'Colaboradores',    value: usuarios.length, icon: Users, color: '#8b5cf6', href: '/dashboard/usuarios' },
          { label: 'Concluídas',       value: totalFeitas, icon: CheckCircle, color: '#10d98c', href: '/dashboard/tarefas?status=feito' },
          { label: 'Atrasadas',        value: totalAtrasadas, icon: AlertTriangle, color: '#ff4d6a', href: '/dashboard/tarefas?status=atrasadas' },
        ].map(({ label, value, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="glass"
            style={{
              padding: '20px',
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              borderRadius: '12px',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-3px)'
              ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 8px 24px ${color}33`
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = ''
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{label}</span>
              <div style={{
                width: '36px', height: '36px',
                background: `${color}18`,
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color={color} />
              </div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: '800', color }}>
              {value}
            </div>
          </Link>
        ))}
      </div>

      {viewMode === 'cards' ? (
        <>
          {/* Colaboradores Grid */}
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Colaboradores</h2>
            <Link href="/dashboard/tarefas" style={{
              color: 'var(--accent-blue)', fontSize: '13px', textDecoration: 'none', fontWeight: '500',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              Ver todas as tarefas →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {usuarios.map(u => {
              const stats = getStats(u.id, tarefas)
              const pct = stats.total > 0 ? Math.round((stats.feito / stats.total) * 100) : 0

              return (
                <div key={u.id} className="glass" style={{ padding: '20px' }}>
                  {/* User Header — clicável → ver tarefas do usuário */}
                  <Link
                    href={`/dashboard/tarefas?usuario=${u.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', textDecoration: 'none', color: 'inherit', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '0.75'}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '1'}
                  >
                    <div style={{
                      width: '44px', height: '44px',
                      background: 'linear-gradient(135deg, #4f7cff22, #8b5cf622)',
                      border: '1px solid rgba(79,124,255,0.3)',
                      borderRadius: '12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: '700', color: '#4f7cff',
                    }}>
                      {u.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px' }}>{u.nome}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </Link>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Progresso geral</span>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: pct === 100 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: `${pct}%`,
                        background: pct === 100 ? 'var(--accent-green)' : 'linear-gradient(90deg, #4f7cff, #8b5cf6)',
                      }} />
                    </div>
                  </div>

                  {/* Stats badges — cada um filtra por usuário + status */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      { label: 'A Fazer',   value: stats.a_fazer,   className: 'badge-gray',                                   status: 'a_fazer'   },
                      { label: 'Fazendo',   value: stats.fazendo,   className: 'badge-blue',                                   status: 'fazendo'   },
                      { label: 'Feitas',    value: stats.feito,     className: 'badge-green',                                  status: 'feito'     },
                      { label: 'Atrasadas', value: stats.atrasadas, className: stats.atrasadas > 0 ? 'badge-red' : 'badge-gray', status: 'atrasadas' },
                    ].map(({ label, value, className, status }) => (
                      <Link
                        key={label}
                        href={`/dashboard/tarefas?usuario=${u.id}&status=${status}`}
                        style={{ textAlign: 'center', textDecoration: 'none', display: 'block', transition: 'transform 0.12s ease' }}
                        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.1)'}
                        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'}
                      >
                        <div className={`badge ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px 4px', borderRadius: '8px', width: '100%' }}>
                          <span style={{ fontSize: '16px', fontWeight: '700', lineHeight: 1 }}>{value}</span>
                          <span style={{ fontSize: '9px', fontWeight: '500', opacity: 0.8 }}>{label}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}

            {usuarios.length === 0 && (
              <div className="glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', gridColumn: '1/-1' }}>
                <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>Nenhum colaborador cadastrado ainda.</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>Adicione usuários pelo Supabase.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <AnalyticsDashboard usuarios={usuarios} tarefas={tarefas} />
      )}
    </div>
  )
}
