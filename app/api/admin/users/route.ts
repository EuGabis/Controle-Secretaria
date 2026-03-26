import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { nome, email, senha, perfil } = await request.json()
    const supabase = createAdminClient()

    // Create user in Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, perfil },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Update name and perfil in usuarios table (trigger creates the row)
    await supabase.from('usuarios').update({ nome, perfil }).eq('id', data.user.id)

    return NextResponse.json({ user: data.user })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()
    const supabase = createAdminClient()

    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, nome, perfil } = await request.json()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('usuarios')
      .update({ nome, perfil })
      .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
