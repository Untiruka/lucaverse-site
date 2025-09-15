// /src/app/api/confirm/route.ts
// ------------------------------------------------------
// 予約確定API（Confirm）デバッグ版（console.log大量）
// ・メール内リンク: GET /api/confirm?id=RESERVATION_ID
// ・管理UI:        POST { reservationId }
// ・DB: 'pending' → 'confirmed'
// ・Googleカレンダー登録
// ・このタイミングで初めて 管理者＆お客さま にメール送信
// ------------------------------------------------------

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { Resend } from 'resend'

// === 型定義（any禁止） ===
type ConfirmBody = { reservationId: string }

type ReservationRow = {
  id: string
  status: 'pending' | 'confirmed' | 'denied'
  date: string           // 'YYYY-MM-DD'
  start_time: string     // 'HH:MM'
  end_time: string       // 'HH:MM'
  course: string         // '30min' | '60min' | '90min' など
  name: string
  tel: string | null
  email: string | null
  coupon1?: string | null
  coupon2?: string | null
  coupon3?: string | null
  notes?: string | null
}

// === ENV（必須） ===
// （補足）メールが届かない場合、まずここが未設定のことが多い
const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM         // 例: '施術屋 Luca <hello@lucaverce.com>'
const EMAIL_TO_ADMIN = process.env.EMAIL_TO_ADMIN // 例: 'xxx@yahoo.co.jp'
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID

// --- Supabase（サービスロール：RLSを超える） ---
function sb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

// --- Google OAuth2（Refresh Token 方式） ---
function googleAuth() {
  const client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: 'urn:ietf:wg:oauth:2.0:oob', // 今回未使用
  })
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return client
}

// --- JST 'YYYY-MM-DD' + 'HH:MM' → RFC3339（JST固定） ---
function toJst(date: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${date}T00:00:00+09:00`)
  d.setHours(h, m, 0, 0)
  return d.toISOString().replace('Z', '+09:00')
}

// --- メール本文（ユーザー：確定通知）---
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
  ].filter(Boolean).join('\n')
}

// --- メール本文（管理者：確定通知）---
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

// --- 共通本体：確定処理＋送信（コンソールログ徹底） ---
async function confirmById(reservationId: string) {
  console.log('[confirm] START', { reservationId })

  // ▼ ENVチェック（どれが未設定かを真偽値で出力）
  console.log('[confirm] ENV check', {
    RESEND_API_KEY: !!RESEND_API_KEY,
    EMAIL_FROM: !!EMAIL_FROM,
    EMAIL_TO_ADMIN: !!EMAIL_TO_ADMIN,
    GOOGLE_CALENDAR_ID: !!GOOGLE_CALENDAR_ID,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: !!process.env.GOOGLE_REFRESH_TOKEN,
  })

  if (!reservationId) {
    console.error('[confirm] ERROR no reservationId')
    throw new Error('reservationId required')
  }
  if (!RESEND_API_KEY || !EMAIL_FROM || !EMAIL_TO_ADMIN || !GOOGLE_CALENDAR_ID) {
    console.error('[confirm] ERROR env_missing')
    throw new Error('env_missing')
  }

  const client = sb()

  // 1) 予約取得
  console.log('[confirm] fetch reservation...')
  const { data: rows, error: fetchErr } = await client
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .limit(1)

  console.log('[confirm] fetch result', { count: rows?.length ?? 0, fetchErr })
  if (fetchErr) throw new Error(`fetch_failed:${fetchErr.message}`)
  if (!rows?.length) throw new Error('not_found')

  const r = rows[0] as ReservationRow
  console.log('[confirm] reservation row', {
    id: r.id, status: r.status, date: r.date, start_time: r.start_time, email: r.email
  })
  if (r.status !== 'pending') {
    console.error('[confirm] ERROR invalid_status', r.status)
    throw new Error(`invalid_status:${r.status}`)
  }

  // 2) 状態更新（confirmed）
  console.log('[confirm] update status -> confirmed')
  const { error: updErr } = await client
    .from('reservations')
    .update({ status: 'confirmed' })
    .eq('id', reservationId)
  console.log('[confirm] update result', { updErr })
  if (updErr) throw new Error(`update_failed:${updErr.message}`)

  // 3) Googleカレンダー登録
  console.log('[confirm] calendar insert...')
  const calendar = google.calendar({ version: 'v3', auth: googleAuth() })
  const insertRes = await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID,
    requestBody: {
      summary: `${r.name} / ${r.course}`,
      description: [
        `■ お名前: ${r.name}`,
        r.tel ? `■ 電話: ${r.tel}` : '',
        r.email ? `■ メール: ${r.email}` : '',
        `■ コース: ${r.course}`,
        `■ 日付: ${r.date}`,
        `■ 時間: ${r.start_time} 〜 ${r.end_time}`,
      ].filter(Boolean).join('\n'),
      start: { dateTime: toJst(r.date, r.start_time), timeZone: 'Asia/Tokyo' },
      end:   { dateTime: toJst(r.date, r.end_time),   timeZone: 'Asia/Tokyo' },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
      source: { title: 'Lucaverse Reservations', url: 'https://lucaverce.com/screen/home' },
    },
  })
  console.log('[confirm] calendar inserted', { eventId: insertRes.data.id })

  // 4) メール送信
  console.log('[confirm] sending emails via Resend...')
  const resend = new Resend(RESEND_API_KEY)

  const adminRes = await resend.emails.send({
    from: EMAIL_FROM,
    to: EMAIL_TO_ADMIN!,
    subject: `予約確定：${r.date} ${r.start_time}`,
    text: adminConfirmText(r),
  })
  console.log('[confirm] admin email result', { data: adminRes?.data, error: adminRes?.error })

  if (r.email) {
    const userRes = await resend.emails.send({
      from: EMAIL_FROM,
      to: r.email,
      subject: '【Luca】ご予約が確定しました',
      text: userConfirmText(r),
    })
    console.log('[confirm] user email result', { data: userRes?.data, error: userRes?.error })
  } else {
    console.warn('[confirm] user email skipped (no email)')
  }

  console.log('[confirm] DONE')
  return { reservationId, calendarEventId: insertRes.data.id ?? null }
}

// --- GET（メール内リンク） ---
export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id') || ''
    console.log('[confirm][GET] hit', { id })
    await confirmById(id)
    return new Response('<html><body>予約を承認しました。</body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    console.error('[confirm][GET] ERROR', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}

// --- POST（管理UIなど） ---
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const { reservationId } = (body as ConfirmBody)
    console.log('[confirm][POST] hit', { reservationId })
    const result = await confirmById(reservationId)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    console.error('[confirm][POST] ERROR', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
