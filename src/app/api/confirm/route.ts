// app/api/confirm/route.ts

// APIはビルド時に実行（事前生成）させない（prerender（事前生成）対策）
export const dynamic = 'force-dynamic' // （ISR/SSG無効化）
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer' 
// ↑ サーバ用（SUPABASE_URL / SUPABASE_ANON_KEY）を使う

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      // 予約IDなし
      return NextResponse.json({ error: '予約IDが必要' }, { status: 400 })
    }

    // 数値IDならパース（DBがint想定の場合）
    const reservationId = Number(id)
    if (Number.isNaN(reservationId)) {
      return NextResponse.json({ error: '予約IDが不正' }, { status: 400 })
    }

    // ★ここで毎回サーバ用クライアントを生成（トップレベルで作らない）
    const supabase = supabaseServer()

    // status を confirmed に更新
    const { error } = await supabase
      .from('reservation')
      .update({ status: 'confirmed' })
      .eq('id', reservationId)

    if (error) {
      // DB更新エラー
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 正常時は簡易HTMLで応答
    return new Response(
      '<html><body>予約を承認しました</body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (e) {
    // 想定外エラー
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
