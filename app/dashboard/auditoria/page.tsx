import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AuditoriaClient from '@/components/AuditoriaClient'

export const dynamic = 'force-dynamic'

export default async function AuditoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (profile?.perfil !== 'master') {
    redirect('/dashboard')
  }

  // Fetch audit logs
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      ator:usuarios(nome)
    `)
    .order('created_at', { ascending: false })
    .limit(100)
    
  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="text-gradient" style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Auditoria Global</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Histórico completo e imutável de todas as ações no sistema</p>
      </div>
      
      {error ? (
        <div className="glass" style={{ padding: '24px', color: 'var(--accent-red)' }}>
          <p style={{ fontWeight: 'bold' }}>Atenção: Tabela de Auditoria não encontrada.</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>Por favor, rode o script SQL que o assistente forneceu no painel do Supabase para inicializar o módulo anti-sabotagem e ativar os gatilhos no PostgreSQL.</p>
        </div>
      ) : (
        <AuditoriaClient initialLogs={logs || []} />
      )}
    </div>
  )
}
