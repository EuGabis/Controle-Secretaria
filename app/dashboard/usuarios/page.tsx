import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsuariosClient from '@/components/UsuariosClient'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (profile?.perfil !== 'admin') redirect('/dashboard')

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('*')
    .order('perfil', { ascending: false }) // admins first
    .order('nome', { ascending: true })

  return <UsuariosClient usuarios={usuarios || []} />
}
