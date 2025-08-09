// app/api/deny/route.ts
// コメント: APIはビルド時に実行させない（prerender（事前生成）対策）
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer' 
// コメント: サーバ用クライアント（SUPABASE_URL / SUPABASE_ANON_KEY を読む）

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')
    if (!idParam) {
      // コメント: クエリに id が無い
      return NextResponse.json({ error: '予約IDが必要' }, { status: 400 })
    }

    // コメント: DBが数値IDなら数値化（文字列IDならこの変換は不要）
    const id = Number(idParam)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: '予約IDが不正' }, { status: 400 })
    }

    // コメント: handler内で毎回生成（トップレベルで作らない）
    const supabase = supabaseServer()

    // コメント: 拒否に更新（スキーマに合わせて 'denied' / 'rejected' のどちらかに）
    const { error } = await supabase
      .from('reservation')
      .update({ status: 'denied' }) // ← もしカラムが 'rejected' ならここを 'rejected' に変える
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // コメント: 成功時は簡易HTMLで応答
    return new Response('<html><body>予約を拒否しました</body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
