'use client'

import { AuditLog } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { useState } from 'react'
import { Search, Eye, X } from 'lucide-react'

interface Props {
  initialLogs: AuditLog[]
}

export default function AuditoriaClient({ initialLogs }: Props) {
  const [logs] = useState<AuditLog[]>(initialLogs)
  const [busca, setBusca] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const logsFiltrados = logs.filter(log => {
    const termo = busca.toLowerCase()
    return (
      (log.ator?.nome || 'Sistema').toLowerCase().includes(termo) ||
      log.acao.toLowerCase().includes(termo) ||
      log.tabela.toLowerCase().includes(termo)
    )
  })

  const getAcaoColor = (acao: string) => {
    switch(acao) {
      case 'INSERT': return 'var(--accent-green)'
      case 'UPDATE': return 'var(--accent-blue)'
      case 'DELETE': return 'var(--accent-red)'
      default: return 'var(--text-primary)'
    }
  }

  const getAcaoLabel = (acao: string) => {
    switch(acao) {
      case 'INSERT': return 'CRIOU'
      case 'UPDATE': return 'EDITOU'
      case 'DELETE': return 'DELETOU'
      default: return acao
    }
  }

  return (
    <div>
      {/* Barra de Filtros */}
      <div className="glass" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px' }}>
        <div style={{
          flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar por usuário, ação (INSERT, UPDATE...) ou tabela"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)',
              padding: '12px 0', outline: 'none', fontSize: '14px'
            }}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Data/Hora</th>
                <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Ator</th>
                <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Ação</th>
                <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Tabela</th>
                <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logsFiltrados.length > 0 ? logsFiltrados.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px', fontSize: '14px' }}>
                    {format(parseISO(log.created_at), "dd MMM yy 'às' HH:mm", { locale: ptBR })}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>
                    {log.ator_id ? log.ator?.nome : 'Sistema/Webhook'}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '700', color: getAcaoColor(log.acao) }}>
                    {getAcaoLabel(log.acao)}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', textTransform: 'capitalize' }}>
                    {log.tabela}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    >
                      <Eye size={14} /> Inspecionar Payload
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal JSON payload */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Inspeção Profunda: Registro {selectedLog.id.split('-')[0]}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Captura bruta contendo os metadados da transação imutáveis.</p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)} 
                style={{ background: 'var(--border)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', display: 'flex', gap: '16px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}><strong>Entidade Afetada:</strong> {selectedLog.tabela}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}><strong>ID Interno:</strong> {selectedLog.registro_id}</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(255,77,106,0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,77,106,0.1)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--accent-red)', marginBottom: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)' }} />
                    DADOS ANTIGOS (REMOVIDOS/SOBREESCRITOS)
                  </div>
                  <pre style={{ margin: 0, background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', color: 'var(--text-primary)', maxHeight: '400px', whiteSpace: 'pre-wrap' }}>
                    {selectedLog.dados_antigos ? JSON.stringify(selectedLog.dados_antigos, null, 2) : 'N/A (Criação Nova)'}
                  </pre>
                </div>
                
                <div style={{ background: 'rgba(16,217,140,0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16,217,140,0.1)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--accent-green)', marginBottom: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)' }} />
                    DADOS NOVOS (NOVO VALOR APLICADO)
                  </div>
                  <pre style={{ margin: 0, background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', color: 'var(--text-primary)', maxHeight: '400px', whiteSpace: 'pre-wrap' }}>
                    {selectedLog.dados_novos ? JSON.stringify(selectedLog.dados_novos, null, 2) : 'N/A (Deleção Total)'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
