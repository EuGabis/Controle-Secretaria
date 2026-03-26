'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div style={{ width: 36, height: 36, flexShrink: 0 }} />

  const currentTheme = theme === 'system' ? resolvedTheme : theme

  return (
    <button
      onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
        background: 'rgba(120, 120, 120, 0.1)', border: '1px solid var(--border)',
        color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
      }}
      title="Alternar Tema"
    >
      {currentTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
