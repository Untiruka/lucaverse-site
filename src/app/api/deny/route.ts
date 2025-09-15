// /src/app/api/deny/route.ts
// ------------------------------------------------------
// 予約拒否API（Deny）
// ・GET /api/deny?id=...（メール内リンク）
// ・DB: 'denied' に更新
// ・ユーザーへ専用文面「その時間はすでに予約枠が埋まっております。」で送信
// ------------------------------------------------------

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// ===== ENV（君のENV名に合わせる） =====
const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM
const TO_ADMIN = process.env.TO_ADMIN // ここでは使わんが、将来用に読んどいてもOK

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_SCHEMA = process.env.SUPABASE_SCHEMA || 'public'
const RESERVATION_TABLE = process.env.RESERVATION_TABLE || 'reservation' // ★単数

function sb() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('supabase_env_missing')
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    db: { schema: SUPABASE_SCHEMA },
  })
}

export async function GET(req: Request) {
  try {
    const id = (new URL(req.url).searchParams.get('id') || '').trim()
    if (!id) return NextResponse.json({ error: '予約IDが必要' }, { status: 400 })

    const client = sb()

    // 1) 予約取得（メール本文に使う）
    const { data: rows, error: fetchErr } = await client
      .from(RESERVATION_TABLE)
      .select('*')
      .eq('id', id)
      .limit(1)
    if (fetchErr) return NextResponse.json({ error: `fetch_failed:${fetchErr.message}` }, { status: 500 })
    if (!rows?.length) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const r = rows[0] as {
      id: string; name: string; email: string | null; date: string; start_time: string; course: string; status: string
    }

    // 2) 更新（denied）
    const { error: updErr } = await client
      .from(RESERVATION_TABLE)
      .update({ status: 'denied' })
      .eq('id', id)
    if (updErr) return NextResponse.json({ error: `update_failed:${updErr.message}` }, { status: 500 })

    // 3) ユーザーへ拒否メール（専用文面）
    if (RESEND_API_KEY && EMAIL_FROM && r.email) {
      const resend = new Resend(RESEND_API_KEY)
      const text = [
        `${r.name} 様`,
        '',
        'この度はご予約ありがとうございました。',
        '大変恐れ入りますが、',
        `ご希望の ${r.date} ${r.start_time} はすでに予約枠が埋まっております。`, // ★指定文言
        '別の日時でのご予約をご検討いただけますと幸いです。',
        '',
        '※このメールは自動送信です。返信不要です。',
      ].join('\n')

      await resend.emails.send({
        from: EMAIL_FROM,
        to: r.email,
        subject: '【Luca】ご予約の承認が見送りとなりました',
        text,
      })
    }

    return new Response('<html><body>予約を拒否しました。</body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
