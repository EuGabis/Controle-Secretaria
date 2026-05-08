import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BancoHorasClient from '@/components/BancoHorasClient'

interface SearchParamsP {
  searchParams: Promise<{ usuario?: string }>
}

export default async function BancoHorasPage({ searchParams }: SearchParamsP) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('usuarios').select('*').eq('id', user.id).single()

  if (!profile) redirect('/dashboard')

  const isAdmin = profile.perfil === 'admin' || profile.perfil === 'master'
  const params = await searchParams
  const targetParam = params?.usuario

  // Se for usuário comum, só pode ver o próprio. Se não está liberado, redireciona.
  let targetUserId = user.id
  if (!isAdmin && !profile.banco_horas_liberado) redirect('/dashboard')

  let usuariosLista: { id: string; nome: string; banco_horas_liberado: boolean }[] = []

  if (isAdmin) {
    let query = supabase.from('usuarios')
      .select('id, nome, banco_horas_liberado, perfil, admin_id, master_id')
      .eq('banco_horas_liberado', true)

    if (profile.perfil === 'admin') {
      query = query.or(`admin_id.eq.${user.id},master_id.eq.${user.id}`)
    }

    const { data: usrs } = await query.order('nome')
    usuariosLista = (usrs || []).map(u => ({ id: u.id, nome: u.nome, banco_horas_liberado: u.banco_horas_liberado }))

    if (targetParam && usuariosLista.find(u => u.id === targetParam)) {
      targetUserId = targetParam
    } else if (usuariosLista.length > 0) {
      targetUserId = usuariosLista[0].id
    } else {
      targetUserId = user.id
    }
  }

  const [
    { data: lancamentos },
    { data: ferias },
    { data: targetUser }
  ] = await Promise.all([
    supabase.from('banco_horas_lancamentos').select('*').eq('usuario_id', targetUserId).order('ordem'),
    supabase.from('banco_horas_ferias').select('*').eq('usuario_id', targetUserId).order('ordem'),
    supabase.from('usuarios').select('id, nome').eq('id', targetUserId).single()
  ])

  return (
    <div style={{ padding: '32px' }}>
      <BancoHorasClient
        currentUserId={user.id}
        targetUserId={targetUserId}
        targetUserNome={targetUser?.nome || profile.nome}
        isAdmin={isAdmin}
        usuariosLista={usuariosLista}
        lancamentos={lancamentos || []}
        ferias={ferias || []}
      />
    </div>
  )
}
