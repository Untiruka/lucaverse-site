// /src/app/api/confirm/route.ts
// 予約確定：pending→confirmed、Googleカレンダー登録、ここで初めてメール送信
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { Resend } from 'resend'

type ConfirmBody = { reservationId: string }
type ReservationRow = {
  id: string
  status: 'pending' | 'confirmed' | 'denied'
  date: string
  start_time: string
  end_time: string
  course: string
  name: string
  tel: string | null
  email: string | null
  coupon1?: string | null
  coupon2?: string | null
  coupon3?: string | null
  notes?: string | null
}

// === ENV（全部必須。未設定なら 500 返す） ===
// コメント: Resend/From/To が未設定だとメールが落ちるので最初にチェック
const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM         // 例: '施術屋 Luca <hello@lucaverce.com>'
const EMAIL_TO_ADMIN = process.env.EMAIL_TO_ADMIN // 例: 'xxx@yahoo.co.jp'
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID
if (!RESEND_API_KEY || !EMAIL_FROM || !EMAIL_TO_ADMIN || !GOOGLE_CALENDAR_ID) {
  console.error('ENV missing', {
    RESEND_API_KEY: !!RESEND_API_KEY,
    EMAIL_FROM: !!EMAIL_FROM,
    EMAIL_TO_ADMIN: !!EMAIL_TO_ADMIN,
    GOOGLE_CALENDAR_ID: !!GOOGLE_CALENDAR_ID,
  })
}

function sb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

function googleAuth() {
  const client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: 'urn:ietf:wg:oauth:2.0:oob',
  })
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return client
}

function toJst(date: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${date}T00:00:00+09:00`)
  d.setHours(h, m, 0, 0)
  return d.toISOString().replace('Z', '+09:00')
}

function desc(r: ReservationRow): string {
  return [
    `■ お名前: ${r.name}`,
    r.tel ? `■ 電話: ${r.tel}` : '',
    r.email ? `■ メール: ${r.email}` : '',
    `■ コース: ${r.course}`,
    `■ 日付: ${r.date}`,
    `■ 時間: ${r.start_time} 〜 ${r.end_time}`,
    r.coupon1 ? `■ クーポン1: ${r.coupon1}` : '',
    r.coupon2 ? `■ クーポン2: ${r.coupon2}` : '',
    r.coupon3 ? `■ クーポン3: ${r.coupon3}` : '',
    r.notes ? `■ 備考: ${r.notes}` : '',
  ].filter(Boolean).join('\n')
}

function userConfirmText(r: ReservationRow): string {
  return [
    'Lucaをご予約いただきありがとうございます。',
    'ご予約が確定しました。',
    '',
    '■ ご予約内容',
    `日付：${r.date}`,
    `時間：${r.start_time}`,
    `コース：${r.course}`,
    `お名前：${r.name}`,
    r.tel ? `電話番号：${r.tel}` : '',
    r.email ? `メール：${r.email}` : '',
    `予約ID：${r.id}`,
    '',
    '※このメールは自動送信です。返信不要です。',
    '変更・キャンセルはお早めにご連絡ください。',
  ].filter(Boolean).join('\n')
}

function adminConfirmText(r: ReservationRow): string {
  return [
    '【予約が確定しました】',
    '',
    '■ 予約内容',
    `予約ID：${r.id}`,
    `日時：${r.date} ${r.start_time}`,
    `コース：${r.course}`,
    `名前：${r.name}`,
    r.tel ? `電話：${r.tel}` : '',
    r.email ? `メール：${r.email}` : '',
  ].filter(Boolean).join('\n')
}

// --- 共通：確定処理 + メール ---
async function confirmById(id: string) {
  if (!RESEND_API_KEY || !EMAIL_FROM || !EMAIL_TO_ADMIN || !GOOGLE_CALENDAR_ID) {
    throw new Error('env_missing')
  }

  const client = sb()

  // 1) 取得（UUID文字列前提。Number変換禁止）
  const { data: rows, error: fetchErr } = await client
    .from('reservations')
    .select('*')
    .eq('id', id)
    .limit(1)
  if (fetchErr) throw new Error(`fetch_failed:${fetchErr.message}`)
  if (!rows?.length) throw new Error('not_found')

  const r = rows[0] as ReservationRow
  if (r.status !== 'pending') throw new Error(`invalid_status:${r.status}`)

  // 2) 更新（confirmed）
  const { error: updErr } = await client
    .from('reservations')
    .update({ status: 'confirmed' })
    .eq('id', id)
  if (updErr) throw new Error(`update_failed:${updErr.message}`)

  // 3) Googleカレンダー
  const calendar = google.calendar({ version: 'v3', auth: googleAuth() })
  const insertRes = await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID,
    requestBody: {
      summary: `${r.name} / ${r.course}`,
      description: desc(r),
      start: { dateTime: toJst(r.date, r.start_time), timeZone: 'Asia/Tokyo' },
      end: { dateTime: toJst(r.date, r.end_time), timeZone: 'Asia/Tokyo' },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
      source: { title: 'Lucaverse Reservations', url: 'https://lucaverce.com/screen/home' },
    },
  })

  // 4) メール送信（Resend）—— 送信結果を必ずログ
  const resend = new Resend(RESEND_API_KEY)

  const adminRes = await resend.emails.send({
    from: EMAIL_FROM,
    to: EMAIL_TO_ADMIN,
    subject: `予約確定：${r.date} ${r.start_time}`,
    text: adminConfirmText(r),
  })
  console.log('confirm:admin email result', { id: adminRes?.data?.id, error: adminRes?.error })

  if (r.email) {
    const userRes = await resend.emails.send({
      from: EMAIL_FROM,
      to: r.email,
      subject: '【Luca】ご予約が確定しました',
      text: userConfirmText(r),
    })
    console.log('confirm:user email result', { id: userRes?.data?.id, error: userRes?.error })
  } else {
    console.warn('confirm:user email skipped(no email)')
  }

  return { reservationId: id, calendarEventId: insertRes.data.id ?? null }
}

// --- GET（メール内リンク） ---
export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id') || ''
    const res = await confirmById(id)
    return new Response(`<html><body>予約を承認しました（ID: ${res.reservationId}）</body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}

// --- POST（管理画面） ---
export async function POST(req: NextRequest) {
  try {
    const { reservationId } = (await req.json()) as ConfirmBody
    const res = await confirmById(reservationId)
    return NextResponse.json({ ok: true, ...res })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
