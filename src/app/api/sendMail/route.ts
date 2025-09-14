// /src/app/api/sendMail/route.ts
// ------------------------------------------------------
// 受け付け専用（メール送信しない）版
// ・予約直後のメール送信は廃止
// ・Confirm/Deny でのみ送る方針に変更
// ------------------------------------------------------

import { NextResponse } from 'next/server'
export const runtime = 'nodejs' // ← Edge回避

export async function POST(req: Request) {
  try {
    // 入力は受けるが、ここでは送らない（将来の互換用ダミー）
    const _body = await req.json().catch(() => ({}))

    // 予約直後には一切メールを送らない
    // ※ ここで実送信を行う実装は削除しました
    return NextResponse.json({ ok: true, message: 'queued:none (use /api/confirm or /api/deny)' })
  } catch (e: unknown) {
    // エラー時も型安全に処理
    const msg = e instanceof Error ? e.message : 'unknown_error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
