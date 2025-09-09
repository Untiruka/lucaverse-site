// /lib/supabaseClient.ts
// ---------------------------------------------------------
// ブラウザ用 Supabase クライアント（遅延生成）
// ・any禁止
// ・SSR/ビルド時に呼ばれても env で落ちないようガード
// ---------------------------------------------------------
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  // SSR/ビルド中に誤って呼ばれた時は明示メッセージで防御（用語：SSR=サーバーサイドレンダリング）
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowser() must be called in a Client Component (browser).')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // ここは実行時（ブラウザ）だけ到達。Vercelのenv未設定を明示。
    throw new Error('Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel')
  }

  if (!_client) {
    _client = createClient(url, key)
  }
  return _client
}
