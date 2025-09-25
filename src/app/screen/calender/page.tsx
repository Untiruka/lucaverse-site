// ------------------------------------------------------
// Server薄ラッパ：ここでは 'use client' は付けない（重要）
// ここで Supabase を触らないことで、SSG/SSR 時の実行を避ける
// ------------------------------------------------------

export const dynamic = 'force-dynamic'   // （動的扱い）
export const revalidate = 0              // （キャッシュ無効）

import ClientCalender from './ClientCalender'

export default function Page() {
  // ※ ブラウザ限定の処理は全部 ClientCalender 側に寄せる
  return <ClientCalender />
}
