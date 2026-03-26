import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  // Check Vercel Cron authorization via secret header, if defined
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}` && 
    process.env.NODE_ENV === 'production'
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const hoje = new Date()
  const diaSemana = hoje.getDay() // 0 = Domingo, 1 = Segunda, ...
  const diaMes = hoje.getDate()   // 1 a 31

  const operations = []
  
  // 1. Resetar Tarefas Diárias e Rotativas (Todos os dias)
  const opDiarias = supabase.from('tarefas')
    .update({ status: 'a_fazer', progresso: 0 })
    .in('tipo', ['diaria', 'rotativa'])
    .neq('status', 'cancelada')
  
  operations.push(opDiarias)

  // 2. Resetar Tarefas Semanais apenas na Segunda-Feira
  if (diaSemana === 1) {
    const opSemanal = supabase.from('tarefas')
      .update({ status: 'a_fazer', progresso: 0 })
      .eq('tipo', 'semanal')
      .neq('status', 'cancelada')

    operations.push(opSemanal)
  }

  // 3. Resetar Tarefas Mensais apenas no Dia 1 do Mês
  if (diaMes === 1) {
    const opMensal = supabase.from('tarefas')
      .update({ status: 'a_fazer', progresso: 0 })
      .eq('tipo', 'mensal')
      .neq('status', 'cancelada')

    operations.push(opMensal)
  }

  // Executar todas as queries simultaneamente
  await Promise.allSettled(operations)

  return NextResponse.json({ 
    success: true, 
    message: 'Cron job concluída: tarefas de rotina foram resetadas.',
    metadata: {
      diaSemana,
      diaMes
    }
  })
}
