'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Edit3, CheckCircle2, Circle, 
  Calendar, Type, Save, Loader2, X, ChevronRight, 
  Settings2, GripVertical, User2, Clock, ExternalLink,
  Download, Filter, Search, Info, DatabaseZap,
  Check, AlertCircle, HelpCircle, Trash
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

// Modelo Original para Importação (se a tabela estiver vazia)
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
  const [respostas, setRespostas] = useState(initialRespostas)
  const [turmas, setTurmas] = useState(initialTurmas)
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(initialTurmas[0]?.id || '')
  
  const [customTitle, setCustomTitle] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  
  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  // Sincroniza título padrão
  useEffect(() => {
    const turma = turmas.find(t => t.id === selectedTurmaId)
    if (turma && !customTitle) setCustomTitle(`Acompanhamento Imersão - ${turma.nome}`)
  }, [selectedTurmaId, turmas, customTitle])

  // Map de respostas para acesso rápido
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
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="link-text">{part.length > 30 ? part.substring(0, 30) + '...' : part}</a>
      }
      return part
    })
  }

  // --- LOGICA DE SALVAMENTO (STATUS E DATA) ---
  const saveValue = async (itemId: string, updates: Partial<ChecklistResposta>) => {
    if (!selectedTurmaId) return
    setSaving(`cell-${itemId}`)
    
    const existing = turmaRespostasMap[itemId]

    // UPDATE OTIMISTA: Atualiza o estado agora
    if (existing) {
      setRespostas(prev => prev.map(r => r.id === existing.id ? { ...r, ...updates } : r))
      const { error } = await supabase.from('checklist_respostas').update({ ...updates, respondido_por: usuarioId, updated_at: new Date().toISOString() }).eq('id', existing.id)
      if (error) {
        console.error("Erro no Update:", error)
        alert("Erro ao salvar! Verifique a conexão.")
      }
    } else {
      const { data, error } = await supabase.from('checklist_respostas').insert({ item_id: itemId, turma_id: selectedTurmaId, ...updates, respondido_por: usuarioId }).select().single()
      if (!error && data) {
        setRespostas(prev => [...prev, data])
      } else {
        console.error("Erro no Insert:", error)
        alert("Erro ao salvar! Verifique se rodou o comando SQL no Supabase.")
      }
    }
    setTimeout(() => setSaving(null), 400)
  }

  // --- GESTÃO DE LINHAS (ADD / DELETE) ---
  const handleAddItem = async () => {
    if (!isAdmin) return
    setIsAddingItem(true)
    const nextN = itens.length > 0 ? Math.max(...itens.map(i => i.item_n)) + 1 : 1
    
    const { data, error } = await supabase.from('checklist_itens').insert({
      item_n: nextN,
      titulo: 'Nova Etapa',
      contexto: 'Novo Prazo',
      responsavel: 'Responsável',
      descricao: '',
      tipo_campo: 'check',
      ordem: nextN
    }).select().single()

    if (!error && data) {
      setItens(prev => [...prev, data])
    } else {
      alert("Erro ao criar linha no banco.")
    }
    setIsAddingItem(false)
  }

  const handleDeleteItem = async (id: string) => {
    if (!isAdmin || !confirm('Deseja excluir esta etapa permanentemente?')) return
    setSaving(`delete-${id}`)
    
    // Primeiro deleta respostas associadas (se não houver cascade no banco)
    await supabase.from('checklist_respostas').delete().eq('item_id', id)
    
    const { error } = await supabase.from('checklist_itens').delete().eq('id', id)
    if (!error) {
      setItens(prev => prev.filter(i => i.id !== id))
    } else {
      alert("Erro ao excluir item.")
    }
    setSaving(null)
  }

  // --- IMPORTAÇÃO / EXPORTAÇÃO ---
  const handleImportTemplate = async () => {
    if (!isAdmin || !confirm('Isso carregará o modelo de 41 etapas. Prosseguir?')) return
    setIsImporting(true)
    for (const d of IMERSAO_TEMPLATE) {
      const { data, error } = await supabase.from('checklist_itens').insert({
        item_n: d.n, contexto: d.p, responsavel: d.r, titulo: d.t, descricao: d.d, tipo_campo: 'check', ordem: d.n
      }).select().single()
      if (!error && data) setItens(prev => [...prev, data].sort((a,b) => a.item_n - b.item_n))
    }
    setIsImporting(false)
  }

  const handleExport = () => {
    setIsExporting(true)
    const headers = ['ITEM', 'PRAZO', 'RESPONSÁVEL', 'ETAPA', 'DESCRIÇÃO', 'DATA', 'STATUS']
    const content = itens.map(i => {
      const r = turmaRespostasMap[i.id]
      return [i.item_n, i.contexto, i.responsavel, i.titulo, i.descricao, r?.valor_data || '-', r?.status || 'PENDENTE']
    })
    const csv = [headers, ...content].map(r => r.join(';')).join('\n')
    const link = document.createElement('a')
    link.href = encodeURI("data:text/csv;charset=utf-8," + "\uFEFF" + csv)
    link.download = `${customTitle.replace(/\//g, '_')}.csv`
    link.click()
    setIsExporting(false)
  }

  return (
    <div className="checklist-v2-container">
      {/* HEADER SECTION */}
      <div className="checklist-v2-header glass">
        <div className="header-left">
          <div className="brand-badge"><DatabaseZap size={20} /></div>
          <div className="title-stack">
            <input 
              className="main-title-input" 
              value={customTitle} 
              onChange={e => setCustomTitle(e.target.value)} 
              placeholder="Nome da Imersão..."
            />
            <span className="subtitle">Gestor de Processos Lito Academy</span>
          </div>
        </div>

        <div className="header-actions">
          {itens.length === 0 && (
            <button className="nav-btn primary" onClick={handleImportTemplate} disabled={isImporting}>
               {isImporting ? <Loader2 className="spin" size={16} /> : <DatabaseZap size={16} />} Importar Base
            </button>
          )}
          
          <div className="turma-pill">
            <Filter size={14} />
            <select value={selectedTurmaId} onChange={e => setSelectedTurmaId(e.target.value)}>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>

          <button className="nav-btn silver" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="spin" size={16} /> : <Download size={16} />} Exportar
          </button>
        </div>
      </div>

      {/* SPREADSHEET TABLE */}
      <div className="table-viewport glass">
        <table className="modern-table">
          <thead>
            <tr>
              <th className="sticky-h col-actions">#</th>
              <th className="sticky-h col-prazo">PRAZO</th>
              <th className="sticky-h col-resp">QUEM</th>
              <th className="sticky-h col-etapa">O QUE FAZER</th>
              <th className="sticky-h col-desc">DETALHAMENTO</th>
              <th className="sticky-h col-data">REALIZAÇÃO</th>
              <th className="sticky-h col-status">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const resp = turmaRespostasMap[item.id]
              const status = resp?.status || 'PENDENTE'
              const isSaving = saving?.includes(item.id)

              return (
                <tr key={item.id} className="row-premium">
                  <td className="cell center-text">
                    <div className="n-cell">
                      <span className="n-badge">{item.item_n}</span>
                      {isAdmin && (
                        <button className="delete-row-btn" onClick={() => handleDeleteItem(item.id)}>
                          <Trash size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="cell prazo-cell">{item.contexto}</td>
                  <td className="cell resp-cell">{item.responsavel}</td>
                  <td className="cell titulo-cell">
                    <div className="inline-edit-wrapper">
                      {item.titulo}
                      {isAdmin && <button className="mini-edit" onClick={() => setEditingItem(item)}><Edit3 size={10} /></button>}
                    </div>
                  </td>
                  <td className="cell desc-cell">{linkify(item.descricao || '')}</td>
                  <td className="cell">
                    <input 
                      type="date" 
                      className="glass-date-input" 
                      value={resp?.valor_data || ''} 
                      onChange={e => saveValue(item.id, { valor_data: e.target.value })} 
                    />
                  </td>
                  <td className="cell">
                    <div className="status-select-wrap">
                      <select 
                        className={`modern-select ${status.toLowerCase()}`}
                        value={status} 
                        onChange={e => saveValue(item.id, { status: e.target.value as any })}
                      >
                        <option value="PENDENTE">🚨 PENDENTE</option>
                        <option value="OK">✅ CONCLUÍDO</option>
                        <option value="N/A">⚪ N/A</option>
                      </select>
                      {isSaving && <div className="saving-indicator"><Loader2 size={10} className="spin" /></div>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {isAdmin && (
          <div className="footer-actions">
            <button className="add-row-btn" onClick={handleAddItem} disabled={isAddingItem}>
              {isAddingItem ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} Adicionar Nova Etapa
            </button>
          </div>
        )}
      </div>

      {/* EDIT MODAL (ADMIN ONLY) */}
      {editingItem && (
        <div className="overlay" onClick={() => setEditingItem(null)}>
          <div className="modal glass" onClick={e => e.stopPropagation()}>
             <div className="modal-header">
                <h3>Editar Processo #{editingItem.item_n}</h3>
                <button className="close-btn" onClick={() => setEditingItem(null)}><X /></button>
             </div>
             <div className="modal-body">
                <div className="input-group">
                  <label>Título da Etapa</label>
                  <input value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value})} />
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>Prazo</label>
                    <input value={editingItem.contexto || ''} onChange={e => setEditingItem({...editingItem, contexto: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>Responsável</label>
                    <input value={editingItem.responsavel || ''} onChange={e => setEditingItem({...editingItem, responsavel: e.target.value})} />
                  </div>
                </div>
                <div className="input-group">
                  <label>Descrição Completa</label>
                  <textarea rows={6} value={editingItem.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} />
                </div>
             </div>
             <div className="modal-footer">
                <button className="nav-btn silver" onClick={() => setEditingItem(null)}>Cancelar</button>
                <button className="nav-btn primary" onClick={async () => {
                  const { error } = await supabase.from('checklist_itens').update({
                    titulo: editingItem.titulo, contexto: editingItem.contexto, responsavel: editingItem.responsavel, descricao: editingItem.descricao
                  }).eq('id', editingItem.id)
                  if (!error) {
                    setItens(prev => prev.map(i => i.id === editingItem.id ? editingItem : i))
                    setEditingItem(null)
                  }
                }}>Salvar</button>
             </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .checklist-v2-container { display: flex; flex-direction: column; gap: 20px; animation: fadeIn 0.4s ease; color: #fff; padding-bottom: 50px; }
        
        .checklist-v2-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08); background: rgba(15, 15, 25, 0.8); }
        .header-left { display: flex; align-items: center; gap: 16px; flex: 1; }
        .brand-badge { width: 44px; height: 44px; background: linear-gradient(135deg, #4f7cff, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(79, 124, 255, 0.3); }
        
        .title-stack { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .main-title-input { background: transparent; border: none; border-bottom: 2px solid transparent; font-size: 24px; font-weight: 800; color: #fff; outline: none; transition: 0.3s; width: 90%; }
        .main-title-input:focus { border-color: #4f7cff; }
        .subtitle { font-size: 11px; color: #6e6e80; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

        .header-actions { display: flex; gap: 12px; align-items: center; }
        .turma-pill { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 0 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); height: 42px; }
        .turma-pill select { background: transparent; border: none; color: #fff; font-size: 14px; font-weight: 700; outline: none; cursor: pointer; }

        .nav-btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .nav-btn.primary { background: #4f7cff; color: #fff; box-shadow: 0 4px 15px rgba(79,124,255,0.2); }
        .nav-btn.silver { background: rgba(255,255,255,0.06); color: #e0e0e6; }
        .nav-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.15); }

        .table-viewport { border-radius: 18px; border: 1px solid rgba(255,255,255,0.08); overflow: auto; background: rgba(10, 10, 20, 0.6); max-height: 75vh; }
        .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 1200px; }
        
        .sticky-h { position: sticky; top: 0; z-index: 10; background: #12121e; padding: 16px; font-size: 11px; font-weight: 800; color: #6e6e80; text-transform: uppercase; text-align: left; border-bottom: 2px solid #252535; }
        
        .row-premium:hover { background: rgba(255,255,255,0.03); }
        .cell { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; vertical-align: top; }
        
        .n-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .n-badge { background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px; font-weight: 800; color: #9494a3; font-size: 11px; }
        .delete-row-btn { background: none; border: none; color: #ff4d6a; opacity: 0; cursor: pointer; transition: 0.2s; }
        .row-premium:hover .delete-row-btn { opacity: 0.5; }
        .delete-row-btn:hover { opacity: 1 !important; transform: scale(1.2); }

        .prazo-cell { font-weight: 700; color: #e0e0e6; }
        .resp-cell { color: #4f7cff; font-weight: 700; }
        .titulo-cell { color: #fff; font-weight: 700; }
        .inline-edit-wrapper { display: flex; justify-content: space-between; align-items: start; gap: 8px; }
        .mini-edit { background: none; border: none; color: #4f7cff; opacity: 0; cursor: pointer; transition: 0.2s; }
        .row-premium:hover .mini-edit { opacity: 0.6; }

        .desc-cell { color: #9494a3; line-height: 1.6; font-size: 12px; white-space: pre-wrap; font-family: inherit; }
        .link-text { color: #4f7cff; font-weight: 700; text-decoration: underline; }

        .glass-date-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px; color: #fff; width: 100%; font-size: 12px; outline: none; cursor: pointer; transition: 0.2s; }
        .glass-date-input:focus { border-color: #4f7cff; background: rgba(79,124,255,0.05); }

        .status-select-wrap { position: relative; width: 100%; }
        .modern-select { width: 100%; border-radius: 10px; padding: 10px; font-size: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; border: 1px solid rgba(255,255,255,0.1); outline: none; }
        .modern-select.ok { background: rgba(16, 217, 140, 0.15); color: #10d98c; border-color: rgba(16, 217, 140, 0.3); }
        .modern-select.pendente { background: rgba(255, 77, 106, 0.15); color: #ff4d6a; border-color: rgba(255, 77, 106, 0.3); }
        .modern-select.n/a { background: rgba(255,255,255,0.05); color: #9494a3; }
        .saving-indicator { position: absolute; top: -6px; right: -6px; background: #4f7cff; border-radius: 50%; padding: 3px; }

        .footer-actions { padding: 24px; display: flex; justify-content: center; background: rgba(255,255,255,0.02); }
        .add-row-btn { display: flex; align-items: center; gap: 10px; padding: 12px 24px; border-radius: 14px; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); color: #9494a3; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .add-row-btn:hover { background: rgba(79,124,255,0.05); border-style: solid; border-color: #4f7cff; color: #fff; transform: scale(1.02); }

        /* MODAL & OVERLAY */
        .overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeInModal 0.3s ease; }
        .modal { width: 100%; max-width: 650px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; background: #0f0f1a; }
        .modal-header { padding: 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .modal-header h3 { margin: 0; font-size: 20px; font-weight: 800; }
        .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 11px; font-weight: 800; color: #6e6e80; text-transform: uppercase; }
        .input-group input, .input-group textarea { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; color: #fff; outline: none; }
        .modal-footer { padding: 20px 24px; display: flex; justify-content: flex-end; gap: 12px; background: rgba(255,255,255,0.02); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
