// app/api/confirm/route.ts

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer' 

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: '予約IDが必要' }, { status: 400 })
    }

    const reservationId = id
    const supabase = supabaseServer()

    // 更新＋更新後の行を取得
    const { data, error } = await supabase
      .from('reservation')
      .update({ status: 'confirmed' })
      .eq('id', reservationId)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      // 更新対象がなかった（存在しないid）
      return NextResponse.json({ error: '該当する予約が存在しません' }, { status: 404 })
    }

    return new Response(
      '<html><body>予約を承認しました</body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (e) {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
