// app/api/confirm/route.ts

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '予約IDが必要' }, { status: 400 })
    }
    if (!isUuid(id)) {
      return NextResponse.json({ error: '予約IDが不正' }, { status: 400 })
    }

    // ★ 環境変数は実際にあるものに合わせる
    const url = process.env.SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      return NextResponse.json({ error: 'サーバ設定エラー: SUPABASE_URL または ANON_KEY 未設定' }, { status: 500 })
    }

    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false },
    })

    const { data, error } = await supabase
      .from('reservation')
      .update({ status: 'confirmed' })
      .eq('id', id)
      .select()

    if (error) {
      console.error('[confirm][update:error]', error)
      return NextResponse.json({ error: 'データ更新に失敗しました' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '該当する予約が存在しません' }, { status: 404 })
    }

    return new Response(
      '<html><body>予約を承認しました</body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (e) {
    console.error('[confirm][unhandled]', e)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
