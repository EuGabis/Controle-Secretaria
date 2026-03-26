import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsuariosClient from '@/components/UsuariosClient'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (profile?.perfil !== 'admin' && profile?.perfil !== 'master') redirect('/dashboard')

  let query = supabase.from('usuarios').select('*')
  if (profile?.perfil === 'master') {
    query = query.or(`id.eq.${user.id},master_id.eq.${user.id}`)
  } else {
    query = query.or(`id.eq.${user.id},admin_id.eq.${user.id}`)
  }

  const { data: usuarios } = await query
    .order('perfil', { ascending: false }) // admins first
    .order('nome', { ascending: true })

  return <UsuariosClient usuarios={usuarios || []} />
}
