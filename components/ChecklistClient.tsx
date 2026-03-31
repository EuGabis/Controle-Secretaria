'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Edit3, CheckCircle2, Circle, 
  Calendar, Type, Save, Loader2, X, ChevronRight, 
  Settings2, GripVertical, User2, Clock, ExternalLink,
  Download, Filter, Search, Info, DatabaseZap,
  MoreVertical, Check, AlertCircle, HelpCircle
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  itens: ChecklistItem[]
  turmas: ChecklistTurma[]
  respostas: ChecklistResposta[]
  perfil: string
  usuarioId: string
}

const IMERSAO_TEMPLATE = [
  { n: 1, p: 'PARA ACERTO DE DATA', r: 'MOACIR NETO', t: 'Agendar com equipe', d: 'Ver data com a empresa a ser visitada / Verificar com Marcos Paulo se a data é possível para ele' },
  { n: 2, p: 'QUANDO CONFIRMAR DATA', r: 'MOACIR NETO', t: 'Selecionar turmas', d: 'Verificar quais são as turmas que podem se inscrever nesta imersão, escrever na lousa para o Bruno saber' },
  { n: 3, p: 'QUANDO CONFIRMAR DATA', r: 'MOACIR NETO', t: 'Pasta e lousa', d: 'Abrir pasta da imersão usando o mesmo padrão para nomear a pasta - mês e ano da imersão, escrita em caixa alta nesta pasta' },
  { n: 4, p: 'QUANDO CONFIRMAR DATA', r: 'MOACIR NETO', t: 'Masterclass', d: 'Agendar Marsterclass para o dia seguinte da imersão' },
  { n: 5, p: 'QUANDO CONFIRMAR DATA', r: 'MOACIR NETO', t: 'Tarefas', d: 'Colocar nas tarefas do Bruno a data para ele liberar a imersão para os alunos' },
  { n: 6, p: 'QUANDO CONFIRMAR DATA', r: 'BRUNO TOSTE', t: 'Turma na Hotscool', d: 'Abrir turma na Hotscool da especialização desejada - Disponibilizar 30 vagas em cada turno - Colocar data de encerramento no dia seguinte da imersão' },
  { n: 7, p: 'QUANDO CONFIRMAR DATA', r: 'BRUNO TOSTE', t: 'Circular 01', d: 'Enviar circular 01 para todas as turmas que puderem participar. Use este modelo e atualize os dados. Copie e cole na pasta da imersão, não preencha diretamente nesta modelo - Email e Lista de transm' },
  { n: 8, p: '45 DIAS ANTES', r: 'BRUNO TOSTE', t: '% DO CURSO', d: 'Verificar se quem se matriculou está com 70% do curso feito, na Hotscool. Quem não tiver, deverá ser retirado da imersão e comunicados sobre essa decisão.' },
  { n: 9, p: '45 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Liberar novas vagas', d: 'Liberar as vagas de quem não estava com 70% do curso feito. Conferir se os novos participantes tem os 85%' },
  { n: 10, p: '40 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Pagamentos', d: 'Verificar se quem se matriculou está com pagamento em dia. Quem não tiver, entrar em contato e dar o prazo de 10 dias para regularizar. Caso negativo, tirar da imersão.' },
  { n: 11, p: '38 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Visita Individual', d: 'Verificar se quem se matriculou, tem a imersão individual, olhar na pasta, caso não tenha, entrar em contato falando da obrigatoriedade de fazer antes da imersão' },
  { n: 12, p: '1 MÊS ANTES', r: 'BRUNO TOSTE', t: '% DO CURSO', d: 'Verificar se quem estava devendo os 100% de conclusão, fez. Caso não tenha feito, retirar da imersão, avisar a pessoa e abrir a vaga para outra pessoa' },
  { n: 13, p: '1 MÊS ANTES', r: 'BRUNO TOSTE', t: 'Ônibus', d: 'Pedir cotação do ônibus para Mayane e passar para alunos cadastrados.' },
  { n: 14, p: '28 MÊS ANTES', r: 'BRUNO TOSTE', t: 'Notas', d: 'Fazer planilha com notas de provas e desmatricular da imersão quem n tiver todas. Cobrar por uma nova imersão, add o nome da pessoa nesta lista para cobrar futuramente' },
  { n: 15, p: '26 MÊS ANTES', r: 'BRUNO TOSTE', t: 'Kit EPI', d: 'Verificar se algum item do Kit epi precisa repor - Fazer encomenda com a Mayane. (mochila, óculos, coletes, luva, protetor auricular, crachás, broche)' },
  { n: 16, p: '20 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Circular 02', d: 'Enviar segunda circular para alunos, atualizando informações - usar este modelo. Copie e cole na pasta da imersão a ser realizada' },
  { n: 17, p: '18 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Cobrar segunda visita', d: 'Ver quem está matriculado e precisa pagar segunda visita, cobrar o pix. Nomes estão nesta lista. Se não pagar em 2 dias, tirar da imersão. Quem pagar, anotar em entradas do financeiro da imersão' },
  { n: 18, p: '15 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Reservar ônibus', d: 'Passar o número de reserrva de alunos para May confirmar com a empresa de ônibus' },
  { n: 19, p: '15 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Equipe', d: 'Verificar quem vai trabalhar no dia. Pedir para Edna vir no sábado. Pedir para Edna verificar se o estoque está abastecido com papel, copos, guardanapos, etc. Pedir para May abastec mercadinho' },
  { n: 20, p: '10 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Passar lista presença para empresa', d: 'Passar a lista para a empresa aérea cadastrar a entrada' },
  { n: 21, p: '6 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Circular final', d: 'Enviar Circular final para alunos. Usar este modelo. Copie ecole na pasta da imersão a ser realizada, alterando as informações necessárias. Confirmar a vinda de cada um' },
  { n: 22, p: '5 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Folha de rosto', d: 'Enviar para a Gla a folha de rosto para pagamento dos instrutores e da equipe. Os instrutores devem ser pagos antes da imersão, e os colaboradores também' },
  { n: 23, p: '4 DIAS ANTES', r: 'MOACIR NETO', t: 'Instruções Gerente', d: 'Passar as instruções para o mecânico gerente, relembrando os itens solicitados no feedback da última imersão (MOACIR)' },
  { n: 24, p: '3 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Fazer lista otimizada', d: 'Preencher lista otimizada com as informações: nome, se comprou kit epi, se pagou ônibus, qual o perído do dia - COPIAR ESTE MODELO' },
  { n: 25, p: '3 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Masterclass', d: 'Quando tiver Marsterclass no dia seguinte ou anterior, mandar circular com endereço, horário, roupas, EPI e verificar se tem material pdf para leitura antecipada dos alunos. IMPRIMIR OS CERTIFICADOS' },
  { n: 26, p: '3 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Imprimir etiquetas para crachás', d: 'Imprimir etiquetas com nomes do crachá' },
  { n: 27, p: '2 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Fotos', d: 'Criar pasta de fotos da imersão dentro desta pasta, criar um QRCode da pasta e peidr para o Gabriel colocar na arte e deixar disponivel no telão da oficina para os alunos' },
  { n: 28, p: '2 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Imprimir papeis', d: 'Imprimir lista de chamadas, provas, gabaritos, Liberação de imagem, planilha que a empresa aérea tem que assinar' },
  { n: 29, p: '2 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Telão', d: 'Atualizar agenda do mês no telão e deixar preparado a arte de bem vindos da imersão e da Masterclass. Deixar pronta a arte com QrCode de avaliação da imersão e Masterclass e avaliação no Google' },
  { n: 30, p: '2 DIAS ANTES', r: 'BRUNO TOSTE', t: 'Montar kits EPI', d: 'Montar kits separando por manhã/tarde / Ver se tem algum professor novo que ainda não recebeu o kit, montar pra ele também' },
  { n: 31, p: '2 DIAS ANTES', r: 'GABRIEL MARCELO', t: 'Teste Equipamentos digitais ', d: 'Verificar se todos os equipamentos digitais que estão alocados na oficina estão em pleno funcionamento: Mesa de som, caixas de som, microfones e telão.' },
  { n: 32, p: '1 DIA ANTES', r: 'BRUNO TOSTE', t: 'Separar tudo que precisa levar', d: 'Separar em caixas, por período e por local.' },
  { n: 33, p: 'NO DIA', r: 'BRUNO TOSTE', t: 'Briefing', d: 'Briefing para fazer com os alunos' },
  { n: 34, p: '1 dia depois', r: 'BRUNO TOSTE', t: 'Guardar tudo', d: 'Guardar o que voltou de forma organizada - BRUNO' },
  { n: 35, p: '1 dia depois', r: 'BRUNO TOSTE', t: 'Corrigir provas', d: 'Corrigir e dar nota em provas' },
  { n: 36, p: '2 dias depois', r: 'MOACIR NETO', t: 'Feedback Gerente', d: 'Escrever um feedback para o gerente do dia, com pontos positivos e pontos a serem melhorados para a próxima imersão. Fazer este arquivo na pasta da imersão para consulta na próxima (SYD)' },
  { n: 37, p: '2 dias depois', r: 'BEATRIZ RODRIGUES', t: 'Encerrar alunos', d: 'Dar baixa dos alunos na Anac' },
  { n: 38, p: '3 dias depois', r: 'BEATRIZ RODRIGUES', t: 'Passar notas para alunos', d: 'Passar para os alunos os históricos e se foram aprovados. Vender uma nova especialização para quem passou. Pedir para avaliar no Google por este link . BEATRIZ' },
  { n: 39, p: '3 dias depois', r: 'BRUNO', t: 'Colocar alunos que faltaram na lista', d: 'Alunos que faltaram e devem pagar nova visita, add nesta lista - BRUNO' },
  { n: 40, p: '4 dias depois', r: 'BRUNO', t: 'Bloquear aluno na Hotscool', d: 'Entrar na imersão realizada e bloquear os alunos naquela imersão, para não contabilizar mais na franquia de alunos - BRUNO' },
  { n: 41, p: '4 dias depois', r: 'BRUNO', t: 'Inativar Turma', d: 'Colocar a turma desta imersão como inativa na Hotscool' }
]

export default function ChecklistClient({ itens: initialItens, turmas: initialTurmas, respostas: initialRespostas, perfil, usuarioId }: Props) {
  const [itens, setItens] = useState(initialItens)
  const [turmas, setTurmas] = useState(initialTurmas)
  const [respostas, setRespostas] = useState(initialRespostas)
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(initialTurmas[0]?.id || '')
  
  const [customTitle, setCustomTitle] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  useEffect(() => {
    const turma = turmas.find(t => t.id === selectedTurmaId)
    if (turma && !customTitle) setCustomTitle(`Acompanhamento Imersão - ${turma.nome}`)
  }, [selectedTurmaId, turmas, customTitle])

  const turmaRespostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.filter(r => r.turma_id === selectedTurmaId).forEach(r => {
      map[r.item_id] = r
    })
    return map
  }, [respostas, selectedTurmaId])

  const linkify = (text: string) => {
    if (!text) return null
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="link-text">
            {part.length > 30 ? part.substring(0, 30) + '...' : part} <ExternalLink size={10} />
          </a>
        )
      }
      return part
    })
  }

  const saveStatus = useCallback(async (itemId: string, newStatus: string) => {
    if (!selectedTurmaId) return
    const key = `status-${itemId}`
    setSaving(key)
    const existing = turmaRespostasMap[itemId]

    // Update Local Otimista
    if (existing) {
      setRespostas(prev => prev.map(r => r.id === existing.id ? { ...r, status: newStatus as any } : r))
      const { error } = await supabase.from('checklist_respostas').update({ status: newStatus, respondido_por: usuarioId, updated_at: new Date().toISOString() }).eq('id', existing.id)
      if (error) console.error(error)
    } else {
      const { data, error } = await supabase.from('checklist_respostas').insert({ item_id: itemId, turma_id: selectedTurmaId, status: newStatus, respondido_por: usuarioId }).select().single()
      if (!error && data) setRespostas(prev => [...prev, data])
    }
    setTimeout(() => setSaving(null), 500)
  }, [turmaRespostasMap, selectedTurmaId, supabase, usuarioId])

  const saveDate = useCallback(async (itemId: string, date: string) => {
    if (!selectedTurmaId) return
    const key = `date-${itemId}`
    setSaving(key)
    const existing = turmaRespostasMap[itemId]

    if (existing) {
      setRespostas(prev => prev.map(r => r.id === existing.id ? { ...r, valor_data: date } : r))
      const { error } = await supabase.from('checklist_respostas').update({ valor_data: date, respondido_por: usuarioId, updated_at: new Date().toISOString() }).eq('id', existing.id)
      if (error) console.error(error)
    } else {
      const { data, error } = await supabase.from('checklist_respostas').insert({ item_id: itemId, turma_id: selectedTurmaId, valor_data: date, respondido_por: usuarioId }).select().single()
      if (!error && data) setRespostas(prev => [...prev, data])
    }
    setTimeout(() => setSaving(null), 500)
  }, [turmaRespostasMap, selectedTurmaId, supabase, usuarioId])

  const handleImportInitialData = async () => {
    if (!isAdmin || !confirm('Isso irá importar os 41 itens do modelo original. Deseja prosseguir?')) return
    setIsImporting(true)
    for (const data of IMERSAO_TEMPLATE) {
      const { data: newItem, error } = await supabase.from('checklist_itens').insert({
        item_n: data.n, contexto: data.p, responsavel: data.r, titulo: data.t, descricao: data.d, tipo_campo: 'check', ordem: data.n - 1
      }).select().single()
      if (!error && newItem) setItens(prev => [...prev, newItem].sort((a,b) => a.item_n - b.item_n))
    }
    setIsImporting(false)
  }

  const exportToCSV = () => {
    setIsExporting(true)
    const rows = [
      ['RELATÓRIO:', customTitle], [],
      ['ITEM', 'PRAZO', 'RESPONSÁVEL', 'ETAPA', 'DESCRIÇÃO', 'DATA REALIZADA', 'STATUS'],
      ...itens.map(item => {
        const resp = turmaRespostasMap[item.id]
        return [item.item_n, item.contexto, item.responsavel, item.titulo, item.descricao?.replace(/\n/g, ' '), resp?.valor_data || '-', resp?.status || 'PENDENTE']
      })
    ]
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n")
    const link = document.createElement("a")
    link.setAttribute("href", encodeURI(csvContent))
    link.setAttribute("download", `${customTitle.replace(/\s/g, '_')}.csv`)
    link.click()
    setIsExporting(false)
  }

  return (
    <div className="checklist-container">
      <div className="checklist-header">
        <div className="header-info">
          <div className="icon-wrapper"><Settings2 size={24} color="#fff" /></div>
          <div className="title-area">
            <input className="editable-title-input" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Título da Imersão..." />
            <p>Edite este título para personalizar seu relatório de exportação</p>
          </div>
        </div>

        <div className="header-controls">
          {itens.length === 0 && isAdmin && (
            <button className="glass-btn primary" onClick={handleImportInitialData} disabled={isImporting}>
              {isImporting ? <Loader2 size={16} className="spin" /> : <DatabaseZap size={16} />} Importar Base
            </button>
          )}
          <select className="turma-select-box glass" value={selectedTurmaId} onChange={(e) => setSelectedTurmaId(e.target.value)}>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <button className="glass-btn silver" onClick={exportToCSV} disabled={isExporting}>
            {isExporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />} Exportar
          </button>
        </div>
      </div>

      <div className="checklist-grid-wrapper glass">
        <table className="checklist-table">
          <thead>
            <tr>
              <th className="header-cell col-n">ITEM</th>
              <th className="header-cell col-prazo">PRAZO</th>
              <th className="header-cell col-resp">RESPONSÁVEL</th>
              <th className="header-cell col-etapa">ETAPA / ITEM</th>
              <th className="header-cell col-desc">DESCRIÇÃO DO PROCESSO</th>
              <th className="header-cell col-data">DATA REALIZADA</th>
              <th className="header-cell col-status">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const resp = turmaRespostasMap[item.id]
              const status = resp?.status || 'PENDENTE'
              const isSaving = saving?.includes(item.id)
              
              return (
                <tr key={item.id} className="row-hover">
                  <td className="body-cell col-n text-muted">{item.item_n}</td>
                  <td className="body-cell col-prazo font-bold">{item.contexto}</td>
                  <td className="body-cell col-resp blue-text">{item.responsavel}</td>
                  <td className="body-cell col-etapa white-text">
                    <div className="etapa-wrapper">{item.titulo}{isAdmin && <button className="edit-btn-mini" onClick={() => setEditingItem(item)}><Edit3 size={10} /></button>}</div>
                  </td>
                  <td className="body-cell col-desc"><div className="desc-text">{linkify(item.descricao || '')}</div></td>
                  <td className="body-cell col-data">
                    <input type="date" className="date-input-flat" value={resp?.valor_data || ''} onChange={(e) => saveDate(item.id, e.target.value)} />
                  </td>
                  <td className="body-cell col-status">
                    <div className="status-select-container">
                      <select 
                        className={`status-dropdown ${status.toLowerCase()}`}
                        value={status}
                        onChange={(e) => saveStatus(item.id, e.target.value)}
                      >
                        <option value="PENDENTE">🔴 PENDENTE</option>
                        <option value="OK">🟢 OK</option>
                        <option value="N/A">⚪ N/A</option>
                      </select>
                      {isSaving && <Loader2 size={10} className="spin saving-icon" />}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .checklist-container { display: flex; flex-direction: column; gap: 24px; animation: fadeIn 0.4s ease; padding-bottom: 40px; }
        .checklist-header { display: flex; justify-content: space-between; align-items: center; }
        .header-info { display: flex; align-items: center; gap: 16px; flex: 1; }
        .icon-wrapper { width: 44px; height: 44px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(79,124,255,0.3); }
        
        .title-area { display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .editable-title-input { background: transparent; border: none; font-size: 24px; font-weight: 800; color: #fff; outline: none; border-bottom: 1px solid transparent; transition: 0.2s; width: 80%; }
        .editable-title-input:focus { border-color: #4f7cff; }
        .title-area p { font-size: 11px; color: #6e6e80; margin: 0; }

        .header-controls { display: flex; gap: 12px; align-items: center; }
        .turma-select-box { background: rgba(255,255,255,0.05); border: 1px solid #303040; border-radius: 10px; color: #fff; padding: 10px 15px; font-size: 14px; font-weight: 600; outline: none; cursor: pointer; }

        .checklist-grid-wrapper { border-radius: 16px; overflow: auto; border: 1px solid #303040; background: rgba(10,10,20,0.7); max-height: 75vh; }
        .checklist-table { width: 100%; border-collapse: separate; border-spacing: 0; }

        .header-cell { background: #12121e; padding: 14px; font-size: 11px; font-weight: 800; border-bottom: 1px solid #303040; color: #6e6e80; position: sticky; top: 0; z-index: 20; text-transform: uppercase; }
        .body-cell { padding: 14px; border-bottom: 1px solid #252530; vertical-align: top; font-size: 13px; }
        .row-hover:hover { background: rgba(255,255,255,0.02); }

        .col-n { width: 50px; text-align: center; }
        .col-prazo { width: 140px; }
        .col-resp { width: 140px; }
        .col-etapa { width: 220px; }
        .col-desc { min-width: 400px; }
        .col-data { width: 150px; }
        .col-status { width: 150px; }

        .status-dropdown { width: 100%; padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid #303040; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; outline: none; }
        .status-dropdown.ok { background: rgba(16, 217, 140, 0.1); border-color: rgba(16, 217, 140, 0.2); color: #10d98c; }
        .status-dropdown.pendente { background: rgba(255, 77, 106, 0.1); border-color: rgba(255, 77, 106, 0.2); color: #ff4d6a; }
        .status-dropdown.n/a { background: rgba(255, 255, 255, 0.05); color: #9494a3; }

        .date-input-flat { background: rgba(255,255,255,0.03); border: 1px solid #303040; border-radius: 8px; color: #fff; padding: 8px; width: 100%; outline: none; }
        .saving-icon { position: absolute; top: -4px; right: -4px; color: #4f7cff; }

        .desc-text { color: #9494a3; line-height: 1.6; font-size: 12px; white-space: pre-wrap; }
        .link-text { color: #4f7cff; text-decoration: none; font-weight: 600; }
        
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
