// app/api/confirm/route.ts

// ★ 事前生成を無効化（ISR/SSGさせない）
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient, PostgrestError } from '@supabase/supabase-js'

// ---------------------------------------------
// ユーティリティ：UUIDバリデーション（形式ミス早期弾き）
// ---------------------------------------------
function isUuid(v: string): boolean {
  // 8-4-4-4-12 の16進 + ハイフン形式
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    // ---------------------------------------------
    // バリデーション：id必須 & UUID形式
    // ---------------------------------------------
    if (!id) {
      // （必須パラメータ不足）
      return NextResponse.json({ error: '予約IDが必要' }, { status: 400 })
    }
    if (!isUuid(id)) {
      // （形式不正の早期リターン）
      return NextResponse.json({ error: '予約IDが不正' }, { status: 400 })
    }

    // ---------------------------------------------
    // Supabase サービスロールクライアント（RLSを通過させる）
    // - NEXT_PUBLIC_ は使わない（クライアント用なのでNG）
    // - SUPABASE_SERVICE_ROLE_KEY を必ずサーバ環境変数に設定
    // ---------------------------------------------
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL // URLは公開可だが読みやすさ優先で流用
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // ★機密（サーバのみ）
    if (!url || !serviceKey) {
      // （環境変数未設定）
      return NextResponse.json({ error: 'サーバ設定エラー: Supabase環境変数が未設定' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false }, // （サーバなのでセッション保持不要）
    })

    // ---------------------------------------------
    // 更新＋更新行取得
    //  - error: SQL/権限系エラー
    //  - data.length===0: 該当行なし（存在しないID/すでに削除 等）
    // ---------------------------------------------
    const { data, error } = await supabase
      .from('reservation')
      .update({ status: 'confirmed' }) // （状態を confirmed に）
      .eq('id', id)                    // （UUID一致）
      .select()                        // （更新行を返す→0件検知できる）

    // ---------------------------------------------
    // エラーハンドリング（詳細はサーバログへ）
    // ---------------------------------------------
    if (error) {
      // （開発中の可観測性向上：詳細はサーバログへ）
      const pgErr = error as PostgrestError
      console.error('[confirm][update:error]', {
        code: pgErr.code,
        message: pgErr.message,
        details: pgErr.details,
        hint: pgErr.hint,
      })
      return NextResponse.json({ error: 'データ更新に失敗しました' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      // （存在しないID等で0件更新）
      return NextResponse.json({ error: '該当する予約が存在しません' }, { status: 404 })
    }

    // ---------------------------------------------
    // 正常時は簡易HTMLで返却（そのままブラウザで見やすい）
    // ---------------------------------------------
    return new Response(
      '<html><body>予約を承認しました</body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (e: unknown) {
    // ---------------------------------------------
    // 想定外エラー（スタックはサーバログへ）
    // ---------------------------------------------
    if (e instanceof Error) {
      console.error('[confirm][unhandled]', e.stack || e.message)
    } else {
      console.error('[confirm][unhandled]', e)
    }
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
