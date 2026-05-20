'use client'

// v9.1 - CHECKLIST ULTIMATE (FRAMING & ALIGNMENT FIX) 📊
// TUDO FUNCIONANDO, SINCRONIZADO E ENQUADRADO

import { useState, useMemo, useEffect } from 'react'
import { ChecklistItem, ChecklistTurma, ChecklistResposta, ChecklistTurmaComentario } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, Trash2, Edit3, Save, Loader2, X, DatabaseZap,
  UploadCloud, FileSpreadsheet,
  ExternalLink, RefreshCw, ListOrdered, Trash,
  MessageCircle, Send
} from 'lucide-react'

interface Props {
  itens: ChecklistItem[]
  turmas: ChecklistTurma[]
  respostas: ChecklistResposta[]
  perfil: string
  usuarioId: string
  categoria?: string // imersao, inicio, encerramento
}

const CATEGORIA_MASTERS: Record<string, string> = {
  'imersao': '00000000-0000-0000-0000-000000000000',
  'inicio': '00000000-0000-0000-0000-000000000001',
  'encerramento': '00000000-0000-0000-0000-000000000002'
}

// Extrai mês e ano de strings como "ENCERRAMENTO - AGOSTO - 2027" ou "INÍCIO MAIO 2028"
const MESES_PT: Record<string, number> = {
  'JANEIRO': 1, 'FEVEREIRO': 2, 'MARCO': 3, 'MARÇO': 3,
  'ABRIL': 4, 'MAIO': 5, 'JUNHO': 6, 'JULHO': 7,
  'AGOSTO': 8, 'SETEMBRO': 9, 'OUTUBRO': 10,
  'NOVEMBRO': 11, 'DEZEMBRO': 12
}

function extrairMesAno(nome: string): { mes: number; ano: number } | null {
  if (!nome) return null
  const up = nome.toUpperCase()
  let mes: number | null = null
  for (const m in MESES_PT) {
    // \b não funciona bem com Ç/acentos; usa regex de borda manual
    const re = new RegExp(`(^|[^A-ZÇ])${m}([^A-ZÇ]|$)`)
    if (re.test(up)) { mes = MESES_PT[m]; break }
  }
  const yearMatch = up.match(/\b(19|20)\d{2}\b/)
  const ano = yearMatch ? parseInt(yearMatch[0]) : null
  if (mes && ano) return { mes, ano }
  return null
}

export default function ChecklistClient({ 
  itens: initialItens, 
  turmas: initialTurmas, 
  respostas: initialRespostas, 
  perfil, 
  usuarioId,
  categoria = 'imersao'
}: Props) {
  const MASTER_ID = CATEGORIA_MASTERS[categoria] || CATEGORIA_MASTERS['imersao']
  // Flag: melhorias recentes (apagar turma, renumerar, badge de gaps, subtítulo, etc)
  // SÓ se aplicam aos checklists de Início e Encerramento, não ao de Imersão.
  const isImersao = categoria === 'imersao'
  
  // Filtrar itens pela categoria (turmas usam turmasState abaixo)
  const filteredItens = useMemo(() => {
    return initialItens.filter(i => (i.categoria || 'imersao') === categoria)
  }, [initialItens, categoria])

  const [itens, setItens] = useState(initialItens) // Mantemos todos no state mas filtramos na renderização
  const [respostas, setRespostas] = useState(initialRespostas)
  const [expandedTurmaId, setExpandedTurmaId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importReplace, setImportReplace] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Comentários por turma
  const [comentariosTurmaId, setComentariosTurmaId] = useState<string | null>(null)
  const [comentarios, setComentarios] = useState<ChecklistTurmaComentario[]>([])
  const [comentariosLoading, setComentariosLoading] = useState(false)
  const [novoComentario, setNovoComentario] = useState('')
  const [enviandoComentario, setEnviandoComentario] = useState(false)
  const [comentariosCount, setComentariosCount] = useState<Record<string, number>>({})

  const isAdmin = perfil === 'admin' || perfil === 'master'
  const supabase = createClient()

  // Buscar contagem de comentários de todas as turmas (uma vez)
  useEffect(() => {
    let cancelled = false
    const fetchCounts = async () => {
      const { data } = await supabase
        .from('checklist_turma_comentarios')
        .select('turma_id')
      if (cancelled || !data) return
      const counts: Record<string, number> = {}
      data.forEach((c: { turma_id: string }) => {
        counts[c.turma_id] = (counts[c.turma_id] || 0) + 1
      })
      setComentariosCount(counts)
    }
    fetchCounts()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abrirComentarios = async (turmaId: string) => {
    setComentariosTurmaId(turmaId)
    setComentariosLoading(true)
    setNovoComentario('')
    const { data, error } = await supabase
      .from('checklist_turma_comentarios')
      .select('*')
      .eq('turma_id', turmaId)
      .order('created_at', { ascending: true })
    setComentariosLoading(false)
    if (error) {
      alert('Erro ao carregar comentários: ' + error.message)
      return
    }
    setComentarios(data || [])
  }

  const fecharComentarios = () => {
    setComentariosTurmaId(null)
    setComentarios([])
    setNovoComentario('')
  }

  const enviarComentario = async () => {
    if (!comentariosTurmaId || !novoComentario.trim()) return
    setEnviandoComentario(true)
    try {
      // Pega o nome do autor do estado de usuários disponível (fallback para o id)
      const { data: meProfile } = await supabase
        .from('usuarios').select('nome').eq('id', usuarioId).single()
      const autorNome = meProfile?.nome || null

      const { data, error } = await supabase
        .from('checklist_turma_comentarios')
        .insert({
          turma_id: comentariosTurmaId,
          autor_id: usuarioId,
          autor_nome: autorNome,
          mensagem: novoComentario.trim()
        })
        .select()
        .single()
      if (error) throw error
      if (data) {
        setComentarios(prev => [...prev, data])
        setComentariosCount(prev => ({ ...prev, [comentariosTurmaId]: (prev[comentariosTurmaId] || 0) + 1 }))
        setNovoComentario('')
      }
    } catch (err: any) {
      alert('Erro ao enviar: ' + (err?.message || err))
    } finally {
      setEnviandoComentario(false)
    }
  }

  const apagarComentario = async (c: ChecklistTurmaComentario) => {
    if (!confirm('Excluir este comentário?')) return
    const { error } = await supabase.from('checklist_turma_comentarios').delete().eq('id', c.id)
    if (error) { alert('Erro ao excluir: ' + error.message); return }
    setComentarios(prev => prev.filter(x => x.id !== c.id))
    setComentariosCount(prev => ({ ...prev, [c.turma_id]: Math.max(0, (prev[c.turma_id] || 0) - 1) }))
  }

  const formatarData = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
             d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch { return iso }
  }

  const handleCreateTurma = async () => {
    const nome = prompt('NOME DO NOVO CHECKLIST / TURMA:')
    if (!nome) return
    
    setIsCreating(true)
    try {
      const { data: newTurma, error: tErr } = await supabase.from('checklist_turmas').insert({
        nome: nome.toUpperCase(),
        ativa: true,
        categoria: categoria
      }).select().single()

      if (tErr || !newTurma) throw tErr

      const templateItens = itens.filter(i => i.turma_id === MASTER_ID)
      const clonedItens = templateItens.map(i => ({
        item_n: i.item_n,
        titulo: i.titulo,
        contexto: i.contexto,
        responsavel: i.responsavel,
        descricao: i.descricao,
        tipo_campo: i.tipo_campo,
        ordem: i.ordem,
        turma_id: newTurma.id,
        categoria: categoria,
        master_item_id: i.id
      }))

      const { data: insertedItens, error: iErr } = await supabase.from('checklist_itens').insert(clonedItens).select()
      if (iErr) throw iErr
      if (insertedItens) setItens(prev => [...prev, ...insertedItens])
      window.location.reload() 
    } catch (err) {
      console.error(err)
      alert('Erro ao criar checklist')
    } finally {
      setIsCreating(false)
    }
  }

  const turmaRespostasMap = useMemo(() => {
    const map: Record<string, ChecklistResposta> = {}
    respostas.forEach(r => { map[`${r.item_id}-${r.turma_id}`] = r })
    return map
  }, [respostas])

  const renderFormattedText = (text: string | null) => {
    if (!text) return '-'
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const url = part.startsWith('http') ? part : `https://${part}`
        return (
          <a key={i} href={url} target="_blank" rel="noreferrer" style={{color: '#4f7cff', textDecoration: 'underline', fontWeight: '800'}}>
            {part} <ExternalLink size={10} style={{display:'inline'}}/>
          </a>
        )
      }
      return part
    })
  }

  const [turmasState, setTurmasState] = useState(initialTurmas)

  const filteredTurmas = useMemo(() => {
    const base = turmasState.filter(t => (t.categoria || 'imersao') === categoria)
    if (categoria !== 'encerramento') return base

    // Encerramento: ordena cronologicamente por ano + mês extraídos do nome.
    // Master sempre primeiro; turmas sem padrão MES/ANO vão para o fim (ordenadas por nome).
    return [...base].sort((a, b) => {
      if (a.id === MASTER_ID) return -1
      if (b.id === MASTER_ID) return 1
      const da = extrairMesAno(a.nome)
      const db = extrairMesAno(b.nome)
      if (da && db) {
        if (da.ano !== db.ano) return da.ano - db.ano
        return da.mes - db.mes
      }
      if (da && !db) return -1
      if (!da && db) return 1
      return a.nome.localeCompare(b.nome)
    })
  }, [turmasState, categoria, MASTER_ID])

  const saveHeader = async (turmaId: string, field: 'nome' | 'descricao' | 'subtitulo', value: string) => {
    setSaving(`header-${turmaId}`);
    const novoValor = field === 'subtitulo' ? (value || null) : value.toUpperCase()
    const payload: Record<string, unknown> = {}
    payload[field] = novoValor

    const { data, error } = await supabase
      .from('checklist_turmas')
      .update(payload)
      .eq('id', turmaId)
      .select()
      .single()

    if (error) {
      console.error('[saveHeader] erro Supabase:', error)
      alert(`Erro ao salvar ${field}: ${error.message}`)
      setSaving(null)
      return
    }

    if (data) {
      setTurmasState(prev => prev.map(t => t.id === turmaId ? { ...t, ...data } : t))
    }
    setTimeout(() => setSaving(null), 300)
  }

  const performSave = async (itemId: string, turmaId: string, updates: Partial<ChecklistResposta>) => {
    setSaving(`cell-${itemId}`)
    
    // Se estiver preenchendo valor_texto, marcamos status como OK para o contador
    const status = (updates.valor_texto && updates.valor_texto.trim().length > 0) ? 'OK' : 'PENDENTE'
    
    const { data } = await supabase.from('checklist_respostas').upsert({
        item_id: itemId, turma_id: turmaId, ...updates, status,
        respondido_por: usuarioId, updated_at: new Date().toISOString()
    }, { onConflict: 'item_id,turma_id' }).select().single()
    
    if (data) {
      setRespostas(prev => {
        const index = prev.findIndex(r => r.item_id === itemId && r.turma_id === turmaId)
        if (index >= 0) {
          const newRes = [...prev]
          newRes[index] = data
          return newRes
        }
        return [...prev, data]
      })
    }
    setTimeout(() => setSaving(null), 300)
  }


  const syncFromMaster = async (turmaId: string) => {
    setSaving(`sync-${turmaId}`)
    try {
      const masterItens = itens.filter(i => i.turma_id === MASTER_ID)
      const turmaItens = itens.filter(i => i.turma_id === turmaId)
      const turmaItensByMaster = new Map(
        turmaItens.filter(i => i.master_item_id).map(i => [i.master_item_id as string, i])
      )

      // IMPORTANTE: 'descricao' NÃO é sincronizada — é texto livre exclusivo de cada turma
      const updates = masterItens
        .filter(m => turmaItensByMaster.has(m.id))
        .map(m => {
          const local = turmaItensByMaster.get(m.id)!
          return supabase.from('checklist_itens').update({
            titulo: m.titulo,
            contexto: m.contexto,
            responsavel: m.responsavel,
            item_n: m.item_n,
            ordem: m.item_n,
            tipo_campo: m.tipo_campo
            // descricao deliberadamente omitida — preserva edição local
          }).eq('id', local.id)
        })

      // Etapas novas começam sem descricao — a turma personaliza depois
      const novos = masterItens
        .filter(m => !turmaItensByMaster.has(m.id))
        .map(m => ({
          item_n: m.item_n,
          titulo: m.titulo,
          contexto: m.contexto,
          responsavel: m.responsavel,
          tipo_campo: m.tipo_campo,
          ordem: m.item_n,
          turma_id: turmaId,
          categoria: categoria,
          master_item_id: m.id
        }))

      await Promise.allSettled(updates)
      if (novos.length > 0) {
        await supabase.from('checklist_itens').insert(novos)
      }

      // Refetch primeiro
      const { data: refreshed } = await supabase
        .from('checklist_itens').select('*').order('item_n', { ascending: true })
      if (refreshed) setItens(refreshed)

      // Renumera automaticamente apenas para Início/Encerramento (não para Imersão)
      let renumeradas = 0
      if (!isImersao) {
        renumeradas = await renumerarSilencioso(turmaId)
        const { data: allItens } = await supabase
          .from('checklist_itens').select('*').order('item_n', { ascending: true })
        if (allItens) setItens(allItens)
      }

      alert(`Sincronizado! ${novos.length} novas etapas adicionadas, ${updates.length} atualizadas${renumeradas > 0 ? `, ${renumeradas} renumeradas` : ''}.`)
    } catch (err) {
      console.error(err)
      alert('Erro ao sincronizar com o Master')
    } finally {
      setSaving(null)
    }
  }

  // Versão silenciosa, usada após sync/delete. Retorna quantas etapas foram renumeradas.
  const renumerarSilencioso = async (turmaId: string): Promise<number> => {
    const turmaItens = [...itens.filter(i => i.turma_id === turmaId)]
      .sort((a, b) => (a.item_n ?? 0) - (b.item_n ?? 0))

    const updates: Promise<unknown>[] = []
    turmaItens.forEach((item, idx) => {
      const novoN = idx + 1
      if (item.item_n === novoN && item.ordem === novoN) return
      updates.push(
        (async () => {
          await supabase.from('checklist_itens')
            .update({ item_n: novoN, ordem: novoN })
            .eq('id', item.id)
        })()
      )
    })

    if (updates.length === 0) return 0
    await Promise.allSettled(updates)
    return updates.length
  }

  const renumerarEtapas = async (turmaId: string) => {
    setSaving(`renumerar-${turmaId}`)
    try {
      const qtd = await renumerarSilencioso(turmaId)
      const { data: allItens } = await supabase
        .from('checklist_itens').select('*').order('item_n', { ascending: true })
      if (allItens) setItens(allItens)
      if (qtd === 0) {
        alert('Numeração já está em ordem.')
      } else {
        alert(`Renumerado! ${qtd} etapas reorganizadas em sequência.`)
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao renumerar etapas')
    } finally {
      setSaving(null)
    }
  }

  // Detecta se há gaps na numeração (ex: 1,2,3,5 → falta 4)
  const temGapsNaNumeracao = (turmaId: string): boolean => {
    const nums = itens
      .filter(i => i.turma_id === turmaId)
      .map(i => i.item_n ?? 0)
      .sort((a, b) => a - b)
    if (nums.length === 0) return false
    for (let i = 0; i < nums.length; i++) {
      if (nums[i] !== i + 1) return true
    }
    return false
  }

  const deletarTurma = async (turmaId: string, turmaNome: string) => {
    if (turmaId === MASTER_ID) {
      alert('A turma Master não pode ser apagada.')
      return
    }
    const c1 = confirm(`⚠️ ATENÇÃO\n\nVocê está prestes a APAGAR a turma:\n\n"${turmaNome}"\n\nIsso vai apagar TODAS as etapas e respostas dessa turma. Esta ação é IRREVERSÍVEL.\n\nDeseja continuar?`)
    if (!c1) return
    const c2 = prompt(`Para confirmar, digite o nome da turma EXATAMENTE como aparece:\n\n${turmaNome}`)
    if (c2 !== turmaNome) {
      alert('Nome não confere. Operação cancelada.')
      return
    }
    setSaving(`del-turma-${turmaId}`)
    try {
      // delete em cascata — itens e respostas
      await supabase.from('checklist_respostas').delete().eq('turma_id', turmaId)
      await supabase.from('checklist_itens').delete().eq('turma_id', turmaId)
      const { error } = await supabase.from('checklist_turmas').delete().eq('id', turmaId)
      if (error) throw error

      setTurmasState(prev => prev.filter(t => t.id !== turmaId))
      setItens(prev => prev.filter(i => i.turma_id !== turmaId))
      setRespostas(prev => prev.filter(r => r.turma_id !== turmaId))
      if (expandedTurmaId === turmaId) setExpandedTurmaId(null)
      alert(`Turma "${turmaNome}" apagada com sucesso.`)
    } catch (err: any) {
      alert('Erro ao apagar turma: ' + (err?.message || err))
    } finally {
      setSaving(null)
    }
  }

  const saveDescricao = async (itemId: string, novaDescricao: string) => {
    const { data, error } = await supabase
      .from('checklist_itens')
      .update({ descricao: novaDescricao || null })
      .eq('id', itemId)
      .select().single()
    if (error) { alert('Erro ao salvar descrição: ' + error.message); throw error }
    if (data) {
      setItens(prev => prev.map(i => i.id === data.id ? { ...i, descricao: data.descricao } : i))
    }
  }

  const exportToExcel = (turmaId: string, turmaNome: string) => {
    const turmaItens = itens.filter(i => i.turma_id === turmaId)
    const html = `<html><head><meta charset="UTF-8"></head><body><table>
      <tr><th colspan="7">${turmaNome}</th></tr>
      ${turmaItens.map(i => `<tr><td>${i.item_n}</td><td>${i.contexto}</td><td>${i.responsavel}</td><td>${i.titulo}</td><td>${i.descricao}</td><td>${turmaRespostasMap[`${i.id}-${turmaId}`]?.valor_data || ''}</td><td>${turmaRespostasMap[`${i.id}-${turmaId}`]?.valor_texto || ''}</td></tr>`).join('')}
    </table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${turmaNome}.xls`; link.click()
  }

  const processImport = async () => {
    if (!importFile) return
    setIsImporting(true)
    const text = await importFile.text()
    const rows = text.split('\n').filter(l => l.trim())
    const newItems = rows.map((r, idx) => {
      const cols = r.split(';')
      return { item_n: parseInt(cols[0]) || idx+1, titulo: cols[1] || 'ETAPA', responsavel: 'ADM', contexto: 'HOJE', tipo_campo: 'check', ordem: idx, categoria: categoria }
    })
    if (importReplace) await supabase.from('checklist_itens').delete().eq('categoria', categoria).neq('id', '0')
    const { data } = await supabase.from('checklist_itens').insert(newItems).select()
    if (data) setItens(prev => [...prev.filter(i => i.categoria !== categoria), ...data])
    setIsImporting(false); setIsImportModalOpen(false)
  }

  return (
    <div className="checklist-v9">
      {/* MODAL EDIÇÃO COMPLETA - ULTRA PREMIUM DESIGN */}
      {editingItem && (
        <div className="overlay-v8" onClick={() => setEditingItem(null)}>
           <div className="modal-v8 premium-glam scale-in" onClick={e => e.stopPropagation()}>
              <div className="m-h">
                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="modal-icon-header"><Edit3 size={20}/></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#fff' }}>EDITOR DE ETAPAS</h3>
                       <span style={{ fontSize: '10px', color: '#4f7cff', fontWeight: '900' }}>CONFIGURAÇÕES INDEPENDENTES</span>
                    </div>
                 </div>
                 <button onClick={() => setEditingItem(null)} className="close-x"><X size={22}/></button>
              </div>
              
              <div className="m-b">
                 <div className="modal-grid-top">
                    <div className="f-group">
                       <label>ETAPA Nº</label>
                       <input className="inp-v8" type="number" value={editingItem.item_n} onChange={e => setEditingItem({...editingItem, item_n: parseInt(e.target.value)})} />
                    </div>
                    <div className="f-group">
                       <label>PRAZO / TAG</label>
                       <input className="inp-v8" value={editingItem.contexto || ''} onChange={e => setEditingItem({...editingItem, contexto: e.target.value.toUpperCase()})} placeholder="EX: D-10" />
                    </div>
                    <div className="f-group">
                       <label>RESPONSÁVEL</label>
                       <input className="inp-v8" value={editingItem.responsavel || ''} onChange={e => setEditingItem({...editingItem, responsavel: e.target.value.toUpperCase()})} placeholder="NOME DO RESPONSÁVEL" />
                    </div>
                 </div>

                 <div className="f-group">
                    <label>TÍTULO DA ATIVIDADE</label>
                    <input className="inp-v8 main-title-inp" value={editingItem.titulo} onChange={e => setEditingItem({...editingItem, titulo: e.target.value.toUpperCase()})} placeholder="DESCREVA A TAREFA" />
                 </div>

                 <div className="f-group">
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span>DETALHAMENTO E LINKS (TEXTO LIVRE)</span>
                      <span style={{ fontSize: '9px', color: '#10d98c', fontWeight: '700', textTransform: 'none', letterSpacing: '0.02em' }}>
                        💾 EXCLUSIVO DESTA TURMA — NÃO É SOBRESCRITO PELO SYNC
                      </span>
                    </label>
                    <textarea
                      className="inp-v8 desc-area"
                      rows={6}
                      value={editingItem.descricao || ''}
                      onChange={e => setEditingItem({ ...editingItem, descricao: e.target.value })}
                      placeholder="COLE LINKS OU OBSERVAÇÕES AQUI..."
                    />
                    <button
                      className="btn-v8 save-desc-btn"
                      disabled={saving === 'desc-save'}
                      onClick={async () => {
                        if (!editingItem) return
                        setSaving('desc-save')
                        try {
                          const { data, error } = await supabase
                            .from('checklist_itens')
                            .update({ descricao: editingItem.descricao || null })
                            .eq('id', editingItem.id)
                            .select()
                            .single()
                          if (error) throw error
                          if (data) {
                            setItens(prev => prev.map(i => i.id === data.id ? { ...i, descricao: data.descricao } : i))
                          }
                        } catch (err: any) {
                          alert('ERRO ao salvar descrição: ' + err.message)
                        } finally {
                          setSaving(null)
                        }
                      }}
                    >
                      {saving === 'desc-save' ? <><Loader2 size={14} className="spin" /> SALVANDO DESCRIÇÃO...</> : <><Save size={14} /> SALVAR APENAS A DESCRIÇÃO</>}
                    </button>
                 </div>
              </div>

              <div className="m-f">
                 <button className="btn-v8 primary-gradient big-btn" onClick={async () => {
                    setSaving('modal-save')
                    try {
                      const isMaster = editingItem.turma_id === MASTER_ID
                      const updates = {
                        item_n: editingItem.item_n,
                        titulo: editingItem.titulo,
                        contexto: editingItem.contexto,
                        responsavel: editingItem.responsavel,
                        descricao: editingItem.descricao,
                        ordem: editingItem.item_n
                      }

                      // 1. Salvar o item atual
                      const { data, error } = await supabase.from('checklist_itens').update(updates).eq('id', editingItem.id).select().single()
                      if (error) throw error

                      // 2. Se for MASTER, propagar edição para itens vinculados (exceto descricao, que é local de cada turma)
                      if (isMaster && data) {
                        await supabase.from('checklist_itens').update({
                           titulo: data.titulo,
                           contexto: data.contexto,
                           responsavel: data.responsavel,
                           item_n: data.item_n,
                           ordem: data.item_n
                        }).eq('master_item_id', data.id)
                      }

                      if (data) {
                         const { data: allItens } = await supabase.from('checklist_itens').select('*').order('item_n', { ascending: true })
                         if (allItens) setItens(allItens)
                         setEditingItem(null)
                      }
                    } catch (err: any) { alert('ERRO: ' + err.message) }
                    finally { setSaving(null) }
                 }}>
                    {saving === 'modal-save' ? <><Loader2 size={18} className="spin"/> SALVANDO...</> : <><Save size={18}/> SALVAR ALTERAÇÕES</>}
                 </button>
              </div>

           </div>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="main-header glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="h-v8-badge"><DatabaseZap size={22} /></div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>
              {categoria === 'imersao' ? 'CHECKLIST - IMERSÃO' : categoria === 'inicio' ? 'INÍCIO TURMA' : 'ENCERRAMENTO DE TURMA'}
            </h1>
            <p style={{ fontSize: '10px', color: '#555', fontWeight: '700' }}>GESTÃO INDEPENDENTE DE PROCESSOS</p>
          </div>
        </div>
        <div>
          {isAdmin && (
            <button className="btn-v8 primary-gradient" onClick={handleCreateTurma} disabled={isCreating}>
              {isCreating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              NOVO CHECKLIST
            </button>
          )}
        </div>
      </div>

      <div className="checklist-container">
        {filteredTurmas.map(turma => {
          const isExpanded = expandedTurmaId === turma.id
          const turmaItens = itens.filter(i => i.turma_id === turma.id)
          const isPadrão = turma.id === MASTER_ID
          const temGaps = temGapsNaNumeracao(turma.id)

          return (
            <div key={turma.id} className={`checklist-instance ${isExpanded ? 'expanded' : ''}`}>
              <div className="instance-header glass" onClick={() => setExpandedTurmaId(isExpanded ? null : turma.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div className={`status-dot ${isPadrão ? 'gold' : 'blue'}`} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span className="turma-name">{turma.nome}</span>
                       {isPadrão && <span className="master-badge">MODÊLO MASTER</span>}
                       {!isImersao && temGaps && isAdmin && (
                         <span className="gap-badge" title="A numeração tem lacunas — clique em RENUMERAR ETAPAS">
                           ⚠ NUMERAÇÃO COM LACUNAS
                         </span>
                       )}
                    </div>
                    {turma.subtitulo && (
                      <div className="turma-subtitulo">{turma.subtitulo}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <span className="turma-meta">{turmaItens.length} ETAPAS</span>
                      <span className="progress-pill">
                        {respostas.filter(r => r.turma_id === turma.id && r.status === 'OK').length} / {turmaItens.length} CONCLUÍDOS
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-comentarios"
                    onClick={e => { e.stopPropagation(); abrirComentarios(turma.id) }}
                    title="Comentários desta turma"
                  >
                    <MessageCircle size={15} />
                    Comentários
                    {(comentariosCount[turma.id] || 0) > 0 && (
                      <span className="com-badge">{comentariosCount[turma.id]}</span>
                    )}
                  </button>
                  <Edit3 size={18} className="icon-expand" />
                </div>
              </div>

              {isExpanded && (
                <div className="instance-content scale-in">
                  <div className="content-inner glass">
                    <div className="table-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                         <input className="h-v8-title" defaultValue={turma.nome} disabled={!isAdmin} onBlur={e => saveHeader(turma.id, 'nome', e.target.value)} />
                         <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                           {isAdmin && !isImersao && (
                             <button className="btn-v8 btn-renumerar" onClick={() => renumerarEtapas(turma.id)} disabled={saving === `renumerar-${turma.id}`}>
                               {saving === `renumerar-${turma.id}` ? <Loader2 size={16} className="spin"/> : <ListOrdered size={16}/>} RENUMERAR ETAPAS
                             </button>
                           )}
                           {isAdmin && !isPadrão && (
                             <button className="btn-v8 primary-gradient" onClick={() => syncFromMaster(turma.id)} disabled={saving === `sync-${turma.id}`}>
                               {saving === `sync-${turma.id}` ? <Loader2 size={16} className="spin"/> : <RefreshCw size={16}/>} SINCRONIZAR COM MASTER
                             </button>
                           )}
                           <button className="btn-v8 primary" onClick={() => exportToExcel(turma.id, turma.nome)}><FileSpreadsheet size={16}/> EXPORTAR</button>
                           {isAdmin && !isPadrão && !isImersao && (
                             <button className="btn-v8 btn-danger" onClick={() => deletarTurma(turma.id, turma.nome)} disabled={saving === `del-turma-${turma.id}`}>
                               {saving === `del-turma-${turma.id}` ? <Loader2 size={16} className="spin"/> : <Trash size={16}/>} APAGAR TURMA
                             </button>
                           )}
                         </div>
                       </div>
                       <input
                         key={`sub-${turma.id}-${turma.subtitulo ?? ''}`}
                         className="h-v8-subtitulo"
                         defaultValue={turma.subtitulo || ''}
                         disabled={!isAdmin}
                         placeholder={isAdmin ? 'SUBTÍTULO (OPCIONAL — ex: Início em 12/05/26 / Turma manhã / etc)' : ''}
                         onBlur={e => {
                           if ((e.target.value || '') !== (turma.subtitulo || '')) {
                             saveHeader(turma.id, 'subtitulo', e.target.value)
                           }
                         }}
                       />
                    </div>

                    <div className="table-wrapper">
                      <table className="t-v8">
                        <thead>
                          <tr>
                             <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                             <th style={{ width: '125px' }}>PRAZO</th>
                             <th style={{ width: '145px' }}>RESPONSÁVEL</th>
                             <th style={{ width: '230px' }}>ETAPA DO PROCESSO</th>
                             <th>DESCRIÇÃO / LINKS</th>
                             <th style={{ width: '175px' }}>DATA</th>
                             <th style={{ width: '170px' }}>SITUAÇÃO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {turmaItens.sort((a,b) => (a.item_n ?? 0) - (b.item_n ?? 0)).map(item => {
                            const resp = turmaRespostasMap[`${item.id}-${turma.id}`]
                            return (
                              <tr key={item.id}>
                                <td className="center" style={{ verticalAlign: 'middle' }}>
                                  <span className="n-pill">{item.item_n}</span>
                                </td>
                                <td className="bold" style={{ verticalAlign: 'middle' }}>{item.contexto}</td>
                                <td className="blue-txt" style={{ verticalAlign: 'middle' }}>{item.responsavel}</td>
                                <td className="bold" style={{ verticalAlign: 'middle' }}>
                                   <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap: '8px'}}>
                                      <span style={{ flex: 1 }}>{item.titulo}</span>
                                      {isAdmin && (
                                        <div className="action-btns" style={{ display: 'flex', gap: '6px' }}>
                                          <button className="edit-btn" onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}><Edit3 size={15}/></button>
                                            <button className="del-btn" onClick={async (e) => {
                                              e.stopPropagation();
                                              if (confirm(`EXCLUIR ESTA ETAPA? (SE FOR NO MASTER, EXCLUIRÁ DE TODAS AS TURMAS)`)) {
                                                const isMaster = item.turma_id === MASTER_ID
                                                const turmasAfetadas = new Set<string>()
                                                turmasAfetadas.add(item.turma_id)
                                                if (isMaster) {
                                                  // coleta todas as turmas que tinham esse master_item
                                                  itens.filter(i => i.master_item_id === item.id).forEach(i => turmasAfetadas.add(i.turma_id))
                                                  await supabase.from('checklist_itens').delete().eq('master_item_id', item.id)
                                                }
                                                await supabase.from('checklist_itens').delete().eq('id', item.id)

                                                // refresh state
                                                const { data: refreshed } = await supabase.from('checklist_itens').select('*').order('item_n', { ascending: true })
                                                if (refreshed) setItens(refreshed)

                                                // Renumera silenciosamente apenas para Início/Encerramento (não Imersão)
                                                if (!isImersao) {
                                                  for (const tId of turmasAfetadas) {
                                                    await renumerarSilencioso(tId)
                                                  }
                                                  const { data: allItens } = await supabase.from('checklist_itens').select('*').order('item_n', { ascending: true })
                                                  if (allItens) setItens(allItens)
                                                }
                                              }
                                            }}><Trash2 size={15}/></button>
                                        </div>
                                      )}
                                   </div>
                                </td>
                                <td className="desc-td dim">
                                  {item.descricao
                                    ? renderFormattedText(item.descricao)
                                    : <span style={{ color: '#444', fontStyle: 'italic', fontSize: 12 }}>— sem descrição —</span>}
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>
                                  <input
                                    type="date"
                                    className="inp-v8 date-inp"
                                    value={resp?.valor_data || ''}
                                    onChange={e => performSave(item.id, turma.id, { valor_data: e.target.value })}
                                  />
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>
                                   <div className="p-rel">
                                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                                        <input className="inp-v8 status-inp" value={resp?.valor_texto || ''} onChange={e => performSave(item.id, turma.id, { valor_texto: e.target.value.toUpperCase() })} />
                                        {resp?.valor_texto && resp.valor_texto.includes('http') && (
                                          <a href={resp.valor_texto} target="_blank" rel="noreferrer" className="external-link"><ExternalLink size={16} /></a>
                                        )}
                                      </div>
                                      {saving === `cell-${item.id}` && <div className="loader-mini"><Loader2 size={10} className="spin"/></div>}
                                   </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {isAdmin && (
                      <div className="footer-v8">
                        <button className="add-v8" onClick={async () => {
                           setSaving(`add-${turma.id}`)
                           const maxN = Math.max(0, ...turmaItens.map(i => i.item_n ?? 0))
                           const newItemData = {
                             item_n: maxN + 1, titulo: 'NOVA ETAPA', contexto: 'D-X', responsavel: 'ADM', ordem: maxN + 1, tipo_campo: 'check', turma_id: turma.id, categoria: categoria
                           }

                           const { data: masterItem, error } = await supabase.from('checklist_itens').insert(newItemData).select().single()
                           
                           if (error) { alert('ERRO: ' + error.message); setSaving(null); return; }

                           if (turma.id === MASTER_ID && masterItem) {
                             const otherTurmas = filteredTurmas.filter(t => t.id !== MASTER_ID)
                              const propagationItens = otherTurmas.map(t => ({
                                ...newItemData,
                                turma_id: t.id,
                                master_item_id: masterItem.id
                              }))
                             if (propagationItens.length > 0) {
                               await supabase.from('checklist_itens').insert(propagationItens)
                             }
                           }

                           const { data: allItens } = await supabase.from('checklist_itens').select('*').order('item_n', { ascending: true })
                           if (allItens) setItens(allItens)
                           setSaving(null)
                        }}>
                           {saving === `add-${turma.id}` ? <Loader2 size={18} className="spin"/> : <Plus size={18} />} 
                           {turma.id === MASTER_ID ? 'ADICIONAR ETAPA (PROPAGAR PARA TODOS)' : 'ADICIONAR ETAPA LOCAL'}
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isImportModalOpen && (
        <div className="overlay-v8" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-v8 scale-in" style={{maxWidth: '450px'}}>
            <div className="m-h"><h3>IMPORTAR CSV</h3><button onClick={() => setIsImportModalOpen(false)} className="close-x"><X/></button></div>
            <div className="m-b">
               <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)} className="inp-v8" />
            </div>
            <div className="m-f">
               <button className="btn-v8 primary" disabled={isImporting || !importFile} onClick={processImport}>IMPORTAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMENTÁRIOS DA TURMA */}
      {comentariosTurmaId && (
        <div className="overlay-v8" onClick={fecharComentarios}>
          <div className="modal-v8 scale-in com-modal" onClick={e => e.stopPropagation()}>
            <div className="m-h">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="modal-icon-header"><MessageCircle size={18} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>COMENTÁRIOS</h3>
                  <span style={{ fontSize: 11, color: '#888', textTransform: 'none' }}>
                    {turmasState.find(t => t.id === comentariosTurmaId)?.nome || ''}
                  </span>
                </div>
              </div>
              <button onClick={fecharComentarios} className="close-x"><X size={20} /></button>
            </div>

            <div className="com-body">
              {comentariosLoading && (
                <div style={{ textAlign: 'center', padding: 30, color: '#666' }}>
                  <Loader2 size={20} className="spin" /> Carregando...
                </div>
              )}
              {!comentariosLoading && comentarios.length === 0 && (
                <div className="com-empty">
                  <MessageCircle size={28} color="#444" />
                  <p>Nenhum comentário ainda.<br/>Seja o primeiro a comentar nesta turma.</p>
                </div>
              )}
              {!comentariosLoading && comentarios.map(c => {
                const isMine = c.autor_id === usuarioId
                const podeApagar = isMine || isAdmin
                return (
                  <div key={c.id} className={`com-item ${isMine ? 'mine' : ''}`}>
                    <div className="com-avatar">{(c.autor_nome || '?').charAt(0).toUpperCase()}</div>
                    <div className="com-content">
                      <div className="com-meta">
                        <strong>{c.autor_nome || 'Usuário'}</strong>
                        <span className="com-time">{formatarData(c.created_at)}</span>
                        {podeApagar && (
                          <button className="com-del" onClick={() => apagarComentario(c)} title="Excluir comentário">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <div className="com-msg">{c.mensagem}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="com-input-row">
              <textarea
                className="com-textarea"
                placeholder="Escreva um comentário..."
                value={novoComentario}
                onChange={e => setNovoComentario(e.target.value)}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault()
                    enviarComentario()
                  }
                }}
                rows={2}
                disabled={enviandoComentario}
              />
              <button
                className="com-send"
                onClick={enviarComentario}
                disabled={enviandoComentario || !novoComentario.trim()}
                title="Enviar (Ctrl+Enter)"
              >
                {enviandoComentario ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .checklist-v9 { display: flex; flex-direction: column; gap: 20px; color: #fff; text-transform: uppercase; padding-bottom: 80px; font-family: 'Inter', sans-serif; }
        .glass { background: rgba(10, 10, 18, 0.96); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; }
        .main-header { padding: 30px; display: flex; justify-content: space-between; align-items: center; }
        .checklist-container { display: flex; flex-direction: column; gap: 15px; }

        .instance-header { padding: 25px 30px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.3s; }
        .instance-header:hover { background: rgba(255,255,255,0.02); }
        .turma-name { font-size: 18px; font-weight: 900; }
        .turma-subtitulo { font-size: 12px; font-weight: 600; color: #8b9bb4; margin-top: 4px; text-transform: none; letter-spacing: 0.01em; }
        .h-v8-title { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 16px; color: #fff; font-size: 16px; font-weight: 800; flex: 1; min-width: 200px; outline: none; text-transform: uppercase; }
        .h-v8-title:focus { border-color: rgba(79,124,255,0.4); }
        .h-v8-title:disabled { opacity: 0.7; cursor: default; }
        .h-v8-subtitulo { background: rgba(0,0,0,0.25); border: 1px dashed rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; color: #b8c4d6; font-size: 13px; font-weight: 600; width: 100%; outline: none; text-transform: none; }
        .h-v8-subtitulo::placeholder { color: #555; font-style: italic; font-size: 12px; }
        .h-v8-subtitulo:focus { border-style: solid; border-color: rgba(79,124,255,0.3); background: rgba(0,0,0,0.4); }
        .h-v8-subtitulo:disabled { opacity: 0.6; cursor: default; }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; }
        .status-dot.gold { background: #ffcc00; }
        .status-dot.blue { background: #4f7cff; }
        .master-badge { background: rgba(255,204,0,0.1); color: #ffcc00; font-size: 9px; padding: 2px 8px; border-radius: 6px; margin-left: 8px; }
        .gap-badge { background: rgba(245,158,11,0.15); color: #f59e0b; font-size: 9px; font-weight: 800; padding: 3px 9px; border-radius: 6px; border: 1px solid rgba(245,158,11,0.3); letter-spacing: 0.04em; }

        /* Botão Comentários no header da turma */
        .btn-comentarios { display: inline-flex; align-items: center; gap: 7px; background: linear-gradient(135deg, #4f7cff, #6366f1); color: #fff; border: none; border-radius: 10px; padding: 9px 16px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; box-shadow: 0 4px 12px rgba(79,124,255,0.25); font-family: 'Inter', sans-serif; letter-spacing: 0.01em; }
        .btn-comentarios:hover { box-shadow: 0 6px 18px rgba(79,124,255,0.4); transform: translateY(-1px); }
        .com-badge { background: rgba(255,255,255,0.25); color: #fff; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 10px; margin-left: 2px; min-width: 18px; text-align: center; }

        /* Modal de comentários */
        .com-modal { max-width: 600px; max-height: 80vh; display: flex; flex-direction: column; }
        .com-body { flex: 1; overflow-y: auto; padding: 20px 30px; display: flex; flex-direction: column; gap: 14px; min-height: 200px; max-height: 50vh; text-transform: none; }
        .com-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 20px; text-align: center; color: #666; font-size: 13px; }
        .com-empty p { margin: 0; line-height: 1.5; }
        .com-item { display: flex; gap: 12px; padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; }
        .com-item.mine { background: rgba(79,124,255,0.06); border-color: rgba(79,124,255,0.2); }
        .com-avatar { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #4f7cff, #8b5cf6); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 13px; }
        .com-content { flex: 1; min-width: 0; }
        .com-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; margin-bottom: 4px; }
        .com-meta strong { color: #d4dceb; font-weight: 700; font-size: 12px; }
        .com-time { color: #666; font-size: 10px; }
        .com-del { margin-left: auto; background: transparent; border: none; color: #555; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; transition: all 0.15s; }
        .com-del:hover { color: #ff4d6a; background: rgba(255,77,106,0.1); }
        .com-msg { color: #b8c4d6; font-size: 13px; line-height: 1.55; word-break: break-word; white-space: pre-wrap; }

        .com-input-row { padding: 16px 24px 24px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; gap: 10px; align-items: flex-end; }
        .com-textarea { flex: 1; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; color: #d4dceb; font-size: 13px; font-family: 'Inter', sans-serif; line-height: 1.5; resize: vertical; outline: none; text-transform: none; min-height: 44px; }
        .com-textarea:focus { border-color: rgba(79,124,255,0.4); box-shadow: 0 0 0 3px rgba(79,124,255,0.08); }
        .com-textarea::placeholder { color: #555; }
        .com-send { width: 44px; height: 44px; border-radius: 10px; border: none; background: linear-gradient(135deg, #10d98c, #059669); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16,217,140,0.3); transition: all 0.15s; }
        .com-send:hover:not(:disabled) { box-shadow: 0 6px 18px rgba(16,217,140,0.5); transform: translateY(-1px); }
        .com-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .progress-pill { background: rgba(16, 217, 140, 0.1); color: #10d98c; font-size: 10px; padding: 4px 12px; border-radius: 8px; font-weight: 900; }

        .content-inner { padding: 0; background: rgba(0,0,0,0.2); border-radius: 0 0 20px 20px; overflow: hidden; }
        .table-header { padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); }
        .table-wrapper { overflow-x: auto; width: 100%; }

        .t-v8 { width: 100%; min-width: 1100px; border-collapse: collapse; table-layout: fixed; }
        .t-v8 th { background: rgba(0,0,0,0.4); padding: 18px 20px; font-size: 10px; color: #555; text-align: left; border-bottom: 2px solid #1a1a24; }
        .t-v8 td { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 13px; word-break: break-word; vertical-align: middle; }
        .t-v8 td.desc-td { padding: 18px 18px !important; vertical-align: top; }
        
        .n-pill { background: rgba(79, 124, 255, 0.1); border: 1px solid rgba(79, 124, 255, 0.2); width: 36px; height: 36px; border-radius: 12px; color: #4f7cff; font-weight: 900; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
        .bold { font-weight: 800; color: #fff; }
        .blue-txt { color: #4f7cff; font-weight: 900; font-size: 11px; }
        .dim { color: #777; font-size: 12px; line-height: 1.6; text-transform: none; }
        
        .inp-v8 { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; color: #fff; width: 100%; outline: none; box-sizing: border-box; }
        .date-inp { padding: 10px 10px; font-size: 13px; font-family: 'Inter', sans-serif; letter-spacing: 0.02em; color-scheme: dark; min-height: 42px; }
        .date-inp::-webkit-calendar-picker-indicator { filter: invert(0.7); cursor: pointer; opacity: 0.7; padding: 0; margin-left: 4px; }
        .date-inp::-webkit-calendar-picker-indicator:hover { opacity: 1; }
        .date-inp::-webkit-datetime-edit { color: #d4dceb; }
        .date-inp::-webkit-datetime-edit-text { color: #555; padding: 0 2px; }
        .date-inp::-webkit-datetime-edit-month-field,
        .date-inp::-webkit-datetime-edit-day-field,
        .date-inp::-webkit-datetime-edit-year-field { color: #d4dceb; font-weight: 600; }
        .date-inp:focus { border-color: rgba(79,124,255,0.4); box-shadow: 0 0 0 3px rgba(79,124,255,0.08); }
        .date-inp:not(:placeholder-shown):not(:focus) { color: #10d98c; }
        .status-inp { color: #10d98c; font-weight: 900; }
        .p-rel { position: relative; width: 100%; }
        .loader-mini { position: absolute; top: -5px; right: -5px; background: #4f7cff; border-radius: 50%; }

        .btn-v8 { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-size: 10px; font-weight: 800; cursor: pointer; border: none; }
        .primary-gradient { background: linear-gradient(135deg, #4f7cff, #8b5cf6); color: #fff; }
        .save-desc-btn { background: linear-gradient(135deg, #10d98c, #059669); color: #fff; margin-top: 10px; align-self: flex-start; padding: 10px 16px; font-size: 11px; box-shadow: 0 4px 14px rgba(16,217,140,0.25); }
        .save-desc-btn:hover { box-shadow: 0 6px 20px rgba(16,217,140,0.4); transform: translateY(-1px); }
        .save-desc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-renumerar { background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
        .btn-renumerar:hover { background: rgba(245,158,11,0.2); }
        .btn-danger { background: rgba(255,77,106,0.12); color: #ff4d6a; border: 1px solid rgba(255,77,106,0.3); }
        .btn-danger:hover { background: rgba(255,77,106,0.22); }

        .overlay-v8 { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(25px); z-index: 9999; display: flex; align-items: center; justify-content: center; }
        .modal-v8 { width: 100%; max-width: 700px; border-radius: 32px; background: rgba(15, 15, 25, 0.98); border: 1px solid rgba(255,255,255,0.1); }
        .m-h { padding: 30px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; }
        .m-b { padding: 30px; display: flex; flex-direction: column; gap: 20px; }
        .m-f { padding: 25px 30px; display: flex; justify-content: flex-end; }
        .modal-grid-top { display: grid; grid-template-columns: 80px 1fr 1fr; gap: 15px; }
        .f-group { display: flex; flex-direction: column; gap: 5px; }
        .f-group label { font-size: 9px; color: #444; font-weight: 900; }

        .action-btns { opacity: 1; transition: 0.3s; display: flex; gap: 6px; }
        .edit-btn, .del-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px; color: #888; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .edit-btn:hover { color: #4f7cff; background: rgba(79,124,255,0.12); border-color: rgba(79,124,255,0.3); }
        .del-btn:hover { color: #ff4d6a; background: rgba(255,77,106,0.12); border-color: rgba(255,77,106,0.3); }

        /* Célula descrição = somente leitura (edição é via modal pelo ícone lápis) */
        .desc-td.dim { color: #9aa6bb; font-size: 13px; line-height: 1.6; text-transform: none; white-space: pre-wrap; word-break: break-word; }
        .desc-td.dim a { color: #4f7cff; font-weight: 700; text-decoration: underline; }

        .scale-in { animation: scaleIn 0.3s ease-out; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

// Edição de descrição agora é exclusivamente via modal (ícone ✏️ ao lado do título)
