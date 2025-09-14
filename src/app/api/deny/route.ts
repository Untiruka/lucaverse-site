// /src/app/api/deny/route.ts
// ------------------------------------------------------
// 予約拒否API：status を denied に更新し、拒否メールを送信
// ------------------------------------------------------

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// ====== 環境変数 ======
const EMAIL_FROM = process.env.EMAIL_FROM || '施術屋 Luca <onboarding@resend.dev>'
const RESEND_API_KEY = process.env.RESEND_API_KEY as string

// ====== Supabase（サーバ） ======
function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

// ====== GET本体 ======
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')
    if (!idParam) {
      return NextResponse.json({ error: '予約IDが必要' }, { status: 400 })
    }
    const id = String(idParam) // 文字列ID/数値IDどちらでも通すため文字列扱い

    const client = sb()

    // 1) 予約行を取得（メール送信用に必要）
    const { data: rows, error: fetchErr } = await client
      .from('reservations')
      .select('*')
      .eq('id', id)
      .limit(1)

    if (fetchErr) {
      return NextResponse.json({ error: 'fetch_failed', details: fetchErr }, { status: 500 })
    }
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const r = rows[0] as {
      id: string
      email: string | null
      name: string
      date: string
      start_time: string
      course: string
      status: string
    }

    // 2) ステータスを denied に更新
    const { error: updErr } = await client
      .from('reservations')
      .update({ status: 'denied' })
      .eq('id', id)

    if (updErr) {
      return NextResponse.json({ error: 'update_failed', details: updErr }, { status: 500 })
    }

    // 3) 拒否メール送信（お客さま）
    if (RESEND_API_KEY && r.email) {
      const resend = new Resend(RESEND_API_KEY)

      // ※ ユーザー要望：「その時間はもうすでに予約枠です」文言を含める
      const userDenyText = [
        `${r.name} 様`,
        '',
        'この度はご予約ありがとうございました。',
        '大変恐れ入りますが、',
        `ご希望の ${r.date} ${r.start_time} はすでに予約枠が埋まっておりました。`,
        '別の日時でのご予約をご検討いただけますと幸いです。',
        '',
        '※このメールは自動送信です。返信不要です。',
      ].join('\n')

      await resend.emails.send({
        from: EMAIL_FROM,
        to: r.email,
        subject: '【Luca】ご予約の承認が見送りとなりました',
        text: userDenyText,
      })
    }

    // 4) 成功応答（簡易HTML）
    return new Response('<html><body>予約を拒否しました</body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
