// サーバ用Supabaseクライアント（API Route / Server Actions向け）
// 注意: サーバでは NEXT_PUBLIC_* を使わない
import { createClient } from '@supabase/supabase-js'

export function supabaseServer() {
  const url = process.env.SUPABASE_URL           // ← Vercelのサーバ用ENV
  const key = process.env.SUPABASE_ANON_KEY      // ← 同上（管理画面に登録必須）
  if (!url || !key) {
    // API内で呼ぶ前提やから、ビルド時には評価されない
    throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY is required')
  }
  return createClient(url, key)
}
