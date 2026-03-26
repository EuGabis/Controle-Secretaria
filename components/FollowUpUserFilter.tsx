'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function FollowUpUserFilter({ usuarios }: { usuarios: { id: string; nome: string }[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedUser = searchParams.get('usuario') || ''

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val) {
      params.set('usuario', val)
    } else {
      params.delete('usuario')
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Filtrar por Usuário</label>
      <select 
        value={selectedUser} 
        onChange={handleChange} 
        className="input-field" 
        style={{ width: '100%', maxWidth: '300px' }}
      >
        <option value="" style={{ background: '#12121a', color: '#f0f0f8' }}>Todos os usuários</option>
        {usuarios.map(u => (
          <option key={u.id} value={u.id} style={{ background: '#12121a', color: '#f0f0f8' }}>{u.nome}</option>
        ))}
      </select>
    </div>
  )
}
