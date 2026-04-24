'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Usuario } from '@/lib/types'
import {
  LayoutDashboard, CheckSquare, Bell, ArrowUpDown,
  LogOut, ChevronRight, Shield, User, Users,
  ListTodo, Calendar, CalendarDays, Repeat, RefreshCw,
  Menu, X, MessageSquare, ShieldAlert, ClipboardCheck
} from 'lucide-react'
import ThemeToggle from './ThemeToggle'

interface SidebarProps {
  user: Usuario | null
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTipo = searchParams.get('tipo')
  const supabase = createClient()
  const [notifCount, setNotifCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const isAdmin = user?.perfil === 'admin' || user?.perfil === 'master'
  const isMaster = user?.perfil === 'master'

  useEffect(() => {
    if (!user) return
    const fetchNotifs = async () => {
      const query = supabase
        .from('notificacoes')
        .select('id', { count: 'exact' })
        .eq('lida', false)
      if (!isAdmin) query.eq('usuario_id', user.id)
      const { count } = await query
      setNotifCount(count || 0)
    }
    fetchNotifs()
  }, [user, isAdmin, supabase])

  // Fecha o menu ao trocar de rota no mobile
  useEffect(() => {
    setIsOpen(false)
  }, [pathname, currentTipo])

  // Bloqueia scroll do body quando menu está aberto no mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const adminLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: '📊 DASHBOARD' },
    { href: '/dashboard/tarefas', icon: CheckSquare, label: 'Tarefas' },
    { href: '/dashboard/checklist', icon: ClipboardCheck, label: 'Checklist Imersão' },
    { href: '/dashboard/checklist-inicio', icon: ClipboardCheck, label: 'Checklist Início' },
    { href: '/dashboard/checklist-encerramento', icon: ClipboardCheck, label: 'Checklist Encerramento' },
    { href: '/dashboard/usuarios', icon: Users, label: 'Usuários' },
    { href: '/dashboard/feedbacks', icon: MessageSquare, label: 'Feedbacks' },
    { href: '/dashboard/follow-up', icon: ArrowUpDown, label: 'Follow Up' },
    { href: '/dashboard/notificacoes', icon: Bell, label: 'Notificações', badge: notifCount },
  ]

  if (isMaster) {
    adminLinks.push({ href: '/dashboard/auditoria', icon: ShieldAlert, label: 'Auditoria' })
  }

  const userLinks = [
    { href: '/dashboard/minhas-tarefas', icon: ListTodo, label: 'Todas Tarefas', exact: true },
    { href: '/dashboard/checklist', icon: ClipboardCheck, label: 'Checklist Imersão' },
    { href: '/dashboard/checklist-inicio', icon: ClipboardCheck, label: 'Checklist Início' },
    { href: '/dashboard/checklist-encerramento', icon: ClipboardCheck, label: 'Checklist Encerramento' },
    { href: '/dashboard/minhas-tarefas?tipo=diaria', icon: RefreshCw, label: 'Diárias', tipo: 'diaria', isSub: true },
    { href: '/dashboard/minhas-tarefas?tipo=semanal', icon: Calendar, label: 'Semanais', tipo: 'semanal', isSub: true },
    { href: '/dashboard/minhas-tarefas?tipo=mensal', icon: CalendarDays, label: 'Mensais', tipo: 'mensal', isSub: true },
    { href: '/dashboard/minhas-tarefas?tipo=rotativa', icon: Repeat, label: 'Rotativas', tipo: 'rotativa', isSub: true },
    { href: '/dashboard/meus-feedbacks', icon: MessageSquare, label: 'Meus Feedbacks' },
    { href: '/dashboard/notificacoes', icon: Bell, label: 'Notificações', badge: notifCount },
  ]

  const links = isAdmin ? adminLinks : userLinks

  return (
    <>
      {/* HEADER MOBILE (Hambúrguer) */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #4f7cff, #8b5cf6)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckSquare color="white" size={16} />
          </div>
          <span style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-0.02em' }} className="text-gradient">
            Lito Academy
          </span>
        </div>
        <button onClick={() => setIsOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <Menu size={26} />
        </button>
      </div>

      {/* OVERLAY MOBILE */}
      {isOpen && (
        <div className="mobile-overlay" onClick={() => setIsOpen(false)} />
      )}

      {/* SIDEBAR MAIN */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <button className="mobile-close" onClick={() => setIsOpen(false)}>
          <X size={24} />
        </button>

        {/* Logo */}
        <div className="sidebar-header" style={{ marginBottom: '32px', paddingLeft: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'linear-gradient(135deg, #4f7cff, #8b5cf6)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckSquare size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700' }}>Lito Academy</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gestão de Tarefas</div>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1 }}>
          <div className="sidebar-nav-title" style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '8px', paddingLeft: '8px' }}>
            MENU
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {links.map((link) => {
              const l = link as any;
              const { href, icon: Icon, label, badge } = l;
              let active = false;
              if (l.exact) {
                active = pathname === '/dashboard/minhas-tarefas' && !currentTipo;
              } else if (l.tipo) {
                active = currentTipo === l.tipo;
              } else {
                active = pathname === href;
              }
              
              return (
                <Link key={href} href={href} className={`sidebar-link ${active ? 'active' : ''}`} style={l.isSub ? { paddingLeft: '24px', fontSize: '12px' } : {}}>
                  <Icon size={l.isSub ? 15 : 18} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge ? (
                    <span className="badge-count" style={{
                      background: 'var(--accent-red)',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: '700',
                      borderRadius: '10px',
                      padding: '1px 6px',
                      minWidth: '18px',
                      textAlign: 'center',
                    }}>
                      {badge}
                    </span>
                  ) : (
                    active && <ChevronRight size={14} />
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User Card */}
        <div className="sidebar-user-card" style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '12px',
          marginTop: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: isAdmin ? 'linear-gradient(135deg, #4f7cff, #8b5cf6)' : 'rgba(255,255,255,0.08)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {isAdmin ? <Shield size={16} color="white" /> : <User size={16} color="var(--text-secondary)" />}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.nome || 'Usuário'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {isMaster ? '👑 Master' : isAdmin ? '🛡️ Admin' : '👤 Colaborador'}
              </div>
            </div>
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            style={{
              marginTop: '10px', width: '100%',
              background: 'rgba(255,77,106,0.08)',
              border: '1px solid rgba(255,77,106,0.2)',
              borderRadius: '8px', padding: '8px',
              color: 'var(--accent-red)', fontSize: '12px', fontWeight: '500',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px', transition: 'all 0.2s',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,77,106,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,77,106,0.08)')}
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </aside>
    </>
  )
}
