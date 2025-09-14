// /src/app/api/deny/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function GET(req: Request) {
  try {
    if (!RESEND_API_KEY || !EMAIL_FROM) throw new Error('env_missing')

    const id = (new URL(req.url).searchParams.get('id') || '').trim()
    if (!id) return NextResponse.json({ error: '予約IDが必要' }, { status: 400 })

    const client = sb()
    const { data: rows, error: fetchErr } = await client
      .from('reservations')
      .select('*')
      .eq('id', id)
      .limit(1)

    if (fetchErr) return NextResponse.json({ error: `fetch_failed:${fetchErr.message}` }, { status: 500 })
    if (!rows?.length) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const r = rows[0] as {
      id: string; name: string; email: string | null; date: string; start_time: string; course: string
    }

    const { error: updErr } = await client
      .from('reservations')
      .update({ status: 'denied' })
      .eq('id', id)
    if (updErr) return NextResponse.json({ error: `update_failed:${updErr.message}` }, { status: 500 })

    if (r.email) {
      const resend = new Resend(RESEND_API_KEY)
      const text = [
        `${r.name} 様`,
        '',
        'この度はご予約ありがとうございました。',
        '大変恐れ入りますが、',
        `ご希望の ${r.date} ${r.start_time} はすでに予約枠が埋まっております。`,
        '別の日時でのご予約をご検討いただけますと幸いです。',
        '',
        '※このメールは自動送信です。返信不要です。',
      ].join('\n')
      const userRes = await resend.emails.send({
        from: EMAIL_FROM,
        to: r.email,
        subject: '【Luca】ご予約の承認が見送りとなりました',
        text,
      })
      console.log('deny:user email result', { id: userRes?.data?.id, error: userRes?.error })
    } else {
      console.warn('deny:user email skipped(no email)')
    }

    return new Response('<html><body>予約を拒否しました</body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
