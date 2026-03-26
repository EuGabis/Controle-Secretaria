'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Usuario } from '@/lib/types'
import {
  LayoutDashboard, CheckSquare, Bell, ArrowUpDown,
  LogOut, ChevronRight, Shield, User, Users,
  ListTodo, Calendar, CalendarDays, Repeat, RefreshCw
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

  const isAdmin = user?.perfil === 'admin'

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const adminLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/tarefas', icon: CheckSquare, label: 'Tarefas' },
    { href: '/dashboard/usuarios', icon: Users, label: 'Usuários' },
    { href: '/dashboard/follow-up', icon: ArrowUpDown, label: 'Follow Up' },
    { href: '/dashboard/notificacoes', icon: Bell, label: 'Notificações', badge: notifCount },
  ]

  const userLinks = [
    { href: '/dashboard/minhas-tarefas', icon: ListTodo, label: 'Todas Tarefas', exact: true },
    { href: '/dashboard/minhas-tarefas?tipo=diaria', icon: RefreshCw, label: 'Diárias', tipo: 'diaria', isSub: true },
    { href: '/dashboard/minhas-tarefas?tipo=semanal', icon: Calendar, label: 'Semanais', tipo: 'semanal', isSub: true },
    { href: '/dashboard/minhas-tarefas?tipo=mensal', icon: CalendarDays, label: 'Mensais', tipo: 'mensal', isSub: true },
    { href: '/dashboard/minhas-tarefas?tipo=rotativa', icon: Repeat, label: 'Rotativas', tipo: 'rotativa', isSub: true },
    { href: '/dashboard/notificacoes', icon: Bell, label: 'Notificações', badge: notifCount },
  ]

  const links = isAdmin ? adminLinks : userLinks

  return (
    <aside className="sidebar" style={{
      width: '240px', minWidth: '240px',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '20px 12px',
      position: 'sticky', top: 0, height: '100vh',
    }}>
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
            <div style={{ fontSize: '14px', fontWeight: '700' }}>Secretaria</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sistema Interno</div>
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
              {isAdmin ? '🛡️ Admin' : '👤 Colaborador'}
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
  )
}
