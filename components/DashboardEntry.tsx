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
  const [overlayGone, setOverlayGone] = useState(false)

  useEffect(() => {
    // Pequeno delay pra garantir que o DOM montou antes de animar
    const t1 = setTimeout(() => setMounted(true), 30)
    // Após o fade-out completar (700ms), desmonta o overlay para não bloquear modais
    const t2 = setTimeout(() => setOverlayGone(true), 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className={`dash-entry ${mounted ? 'mounted' : ''}`}>
      {/* Overlay de fade-in inicial — desmonta após animação para não bloquear modais */}
      {!overlayGone && <div className="dash-fade-overlay" aria-hidden />}
      <div className="dash-content">{children}</div>

      <style jsx>{`
        .dash-entry { position: relative; min-height: 100vh; }

        .dash-fade-overlay {
          position: fixed;
          inset: 0;
          background: #05060a;
          pointer-events: none;
          z-index: 40;            /* < z-index dos modais (50+) */
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
      `}</style>
    </div>
  )
}
