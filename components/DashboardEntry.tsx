'use client'

import { useEffect, useState } from 'react'

interface Props {
  children: React.ReactNode
}

/**
 * Wrapper que aplica animação de entrada no conteúdo do dashboard.
 * Quando o usuário acaba de logar (vem do /login), faz fade+slide
 * com stagger nos elementos filhos.
 */
export default function DashboardEntry({ children }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Pequeno delay pra garantir que o DOM montou antes de animar
    const t = setTimeout(() => setMounted(true), 30)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`dash-entry ${mounted ? 'mounted' : ''}`}>
      {/* Overlay de fade-in inicial (escurece momentaneamente e some) */}
      <div className="dash-fade-overlay" />
      <div className="dash-content">{children}</div>

      <style jsx>{`
        .dash-entry { position: relative; min-height: 100vh; }

        .dash-fade-overlay {
          position: fixed;
          inset: 0;
          background: #05060a;
          pointer-events: none;
          z-index: 9998;
          opacity: 1;
          transition: opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dash-entry.mounted .dash-fade-overlay {
          opacity: 0;
        }

        .dash-content {
          opacity: 0;
          transform: translateY(12px) scale(0.985);
          transition:
            opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.1s,
            transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s;
        }
        .dash-entry.mounted .dash-content {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        /* Aplica stagger sutil em cards filhos quando existem */
        :global(.dash-entry.mounted .glass),
        :global(.dash-entry.mounted .kanban-col),
        :global(.dash-entry.mounted .sidebar-link) {
          animation: itemIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes itemIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
