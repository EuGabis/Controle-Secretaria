export type Perfil = 'admin' | 'usuario' | 'master'

export type StatusTarefa = 'a_fazer' | 'fazendo' | 'feito' | 'atrasado' | 'cancelada'

export type TarefaTipo = 'normal' | 'diaria' | 'semanal' | 'mensal' | 'rotativa'

export type PrioridadeTarefa = 'baixa' | 'media' | 'alta' | 'urgente'

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: Perfil
  admin_id?: string | null
  master_id?: string | null
  created_at: string
}

export interface Tarefa {
  id: string
  titulo: string
  descricao: string | null
  data_limite: string
  status: StatusTarefa
  tipo: TarefaTipo
  prioridade: PrioridadeTarefa
  progresso: number
  observacao: string | null
  alerta_enviado: boolean
  usuario_id: string
  criado_por: string
  created_at: string
  usuario?: Usuario
}

export interface Notificacao {
  id: string
  mensagem: string
  tipo: 'individual' | 'coletiva'
  usuario_id: string | null
  lida: boolean
  created_at: string
}

export interface RespostaNotificacao {
  id: string
  notificacao_id: string
  de_usuario_id: string
  mensagem: string
  created_at: string
  autor?: Usuario
}

export interface FollowUpLog {
  id: string
  tarefa_id: string
  usuario_id: string
  status_anterior: StatusTarefa
  status_novo: StatusTarefa
  alterado_em: string
  tarefa?: Tarefa
  usuario?: Usuario
}

export interface AuditLog {
  id: string
  ator_id: string | null
  acao: 'INSERT' | 'UPDATE' | 'DELETE'
  tabela: string
  registro_id: string
  dados_antigos: any
  dados_novos: any
  created_at: string
  ator?: { nome: string }
}

export interface ChecklistItem {
  id: string
  titulo: string // ETAPA
  item_n: number
  responsavel: string | null
  contexto: string | null // PRAZO
  descricao: string | null
  tipo_campo: 'check' | 'texto' | 'data'
  ordem: number
  turma_id: string
  categoria?: string
  master_item_id?: string | null
  created_at: string
}

export interface ChecklistTurma {
  id: string
  nome: string
  ativa: boolean
  categoria?: string
  created_at: string
}

export interface ChecklistResposta {
  id: string
  item_id: string
  turma_id: string
  valor_texto: string | null
  valor_data: string | null
  status: 'PENDENTE' | 'OK' | 'N/A'
  respondido_por: string | null
  updated_at: string
  autor?: Usuario
}
