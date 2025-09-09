// lib/supabaseClient.ts
// ---------------------------------------------------------
// ブラウザ用の Supabase クライアントを「必要になった時だけ」生成する。
// これでビルド時（prerender/SSR）に環境変数未設定で落ちるのを回避。
// ---------------------------------------------------------

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  // コメント：NEXT_PUBLIC はブラウザに埋め込まれる公開用（env）
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // コメント：実行時にチェックして、原因が一目で分かるエラーを投げる
  if (!url || !key) {
    throw new Error(
      'Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel'
    )
  }

  // コメント：シングルトン（1回だけ生成して使い回す）
  if (!_client) {
    _client = createClient(url, key)
  }
  return _client
}
