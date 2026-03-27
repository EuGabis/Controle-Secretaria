'use client'

import { Tarefa, Usuario } from '@/lib/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { isAfter, parseISO } from 'date-fns'

interface Props {
  usuarios: Usuario[]
  tarefas: Tarefa[]
}

export default function AnalyticsDashboard({ usuarios, tarefas }: Props) {
  // 1. Process Pie Chart Data (Status)
  const statusData = [
    { name: 'A Fazer', value: tarefas.filter(t => t.status === 'a_fazer').length, color: '#8b949e' },
    { name: 'Fazendo', value: tarefas.filter(t => t.status === 'fazendo').length, color: '#4f7cff' },
    { name: 'Feito', value: tarefas.filter(t => t.status === 'feito').length, color: '#10d98c' },
  ]
  
  // 2. Process Bar Chart Data (By User)
  const barData = usuarios.map(u => {
    const userTarefas = tarefas.filter(t => t.usuario_id === u.id)
    return {
      name: u.nome.split(' ')[0], // first name only
      'A Fazer': userTarefas.filter(t => t.status === 'a_fazer').length,
      'Fazendo': userTarefas.filter(t => t.status === 'fazendo').length,
      'Feito': userTarefas.filter(t => t.status === 'feito').length,
      'Atrasadas': userTarefas.filter(t => t.status !== 'feito' && isAfter(new Date(), parseISO(t.data_limite))).length,
    }
  }).sort((a, b) => (b['A Fazer'] + b['Fazendo'] + b['Feito']) - (a['A Fazer'] + a['Fazendo'] + a['Feito'])) // sort by total tasks

  // Config do tema escuro para o Tooltip
  const tooltipStyle = {
    backgroundColor: '#1f2238',
    borderColor: '#2d334e',
    borderRadius: '12px',
    color: '#e2e8f0',
    padding: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '24px', alignItems: 'start' }}>
      
      {/* Gráfico de Pizza - Distribuição de Status */}
      <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Distribuição de Status</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Métrica geral de toda a equipe
        </p>
        <div style={{ flex: 1, minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {tarefas.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#ffffff', fontWeight: 'bold' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>Sem dados suficientes</div>
          )}
        </div>
      </div>

      {/* Gráfico de Barras - Carga de Trabalho */}
      <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Carga de Trabalho por Colaborador</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Volume e andamento de tarefas distribuídas
        </p>
        <div style={{ flex: 1, minHeight: '300px' }}>
          {usuarios.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barData}
                margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
                barSize={32}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={tooltipStyle}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                <Bar dataKey="A Fazer" stackId="a" fill="#8b949e" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Fazendo" stackId="a" fill="#4f7cff" />
                <Bar dataKey="Feito" stackId="a" fill="#10d98c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Nenhum colaborador encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
