// /src/app/api/confirm/route.ts
// ------------------------------------------------------
// 予約確定API（Confirm／デバッグ強化版）
// ・GET /api/confirm?id=...（メール内リンク）
// ・POST { reservationId }（管理UI想定）
// ・DB: pending → confirmed
// ・Googleカレンダー登録は「非ブロッキング」（失敗しても処理継続）
// ・このタイミングで 管理者＆ユーザー にメール送信
// ------------------------------------------------------

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import { Resend } from 'resend'

// ===== 型定義（any禁止）=====
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

// ===== ENV（メール関連は必須／カレンダーはあれば使う）=====
const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM                   // 例: '施術屋 Luca <hello@lucaverce.com>'
const EMAIL_TO_ADMIN = process.env.EMAIL_TO_ADMIN           // 管理者宛
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID   // 予約を書き込むカレンダーID

// OAuth2（リフレッシュトークン方式）
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN

// Service Account（JWT方式）
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY // 改行は \n でOK

// ===== Supabase（サービスロールでRLS越え）=====
function sb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

// ===== JST 'YYYY-MM-DD' + 'HH:MM' → RFC3339（JSTで固定）=====
function toJst(date: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${date}T00:00:00+09:00`)
  d.setHours(h, m, 0, 0)
  return d.toISOString().replace('Z', '+09:00')
}

// ===== メール本文 =====
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

// ===== Google カレンダー クライアント取得（2系統フォールバック）=====
function getCalendarClient():
  | { calendar: ReturnType<typeof google.calendar>, mode: 'service' | 'oauth' }
  | null {
  // ① Service Account（JWT）：カレンダーをSAのメールに「予定の変更可」で共有しておく必要あり
  if (GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    const jwt = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
    return { calendar: google.calendar({ version: 'v3', auth: jwt }), mode: 'service' }
  }

  // ② OAuth2（Refresh Token）
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN) {
    const oauth2 = new google.auth.OAuth2({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri: 'urn:ietf:wg:oauth:2.0:oob', // 使わない
    })
    oauth2.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN })
    return { calendar: google.calendar({ version: 'v3', auth: oauth2 }), mode: 'oauth' }
  }

  // どちらも無ければ null（→ カレンダーはスキップ）
  return null
}

// ===== カレンダー登録（失敗しても throw しない＝非ブロッキング）=====
async function insertCalendarSilently(r: ReservationRow): Promise<string | null> {
  if (!GOOGLE_CALENDAR_ID) {
    console.warn('[confirm] calendar skipped: GOOGLE_CALENDAR_ID missing')
    return null
  }
  const client = getCalendarClient()
  if (!client) {
    console.warn('[confirm] calendar skipped: no credentials (service or oauth)')
    return null
  }

  try {
    console.log('[confirm] calendar insert start', { mode: client.mode })
    const res = await client.calendar.events.insert({
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
          r.notes ? `■ 備考: ${r.notes}` : '',
        ].filter(Boolean).join('\n'),
        start: { dateTime: toJst(r.date, r.start_time), timeZone: 'Asia/Tokyo' },
        end:   { dateTime: toJst(r.date, r.end_time),   timeZone: 'Asia/Tokyo' },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
        source: { title: 'Lucaverse Reservations', url: 'https://lucaverce.com/screen/home' },
      },
    })
    const eventId = res.data.id ?? null
    console.log('[confirm] calendar inserted', { eventId })
    return eventId
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[confirm] calendar insert FAILED', msg)
    return null
  }
}

// ===== 本体（確定→カレンダー（非ブロック）→メール送信）=====
async function confirmById(reservationId: string) {
  console.log('[confirm] START', { reservationId })
  console.log('[confirm] ENV check (mail)',
    { RESEND_API_KEY: !!RESEND_API_KEY, EMAIL_FROM: !!EMAIL_FROM, EMAIL_TO_ADMIN: !!EMAIL_TO_ADMIN })
  console.log('[confirm] ENV check (calendar)',
    {
      GOOGLE_CALENDAR_ID: !!GOOGLE_CALENDAR_ID,
      SA_EMAIL: !!GOOGLE_SERVICE_ACCOUNT_EMAIL,
      SA_KEY: !!GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      OAUTH_RT: !!GOOGLE_REFRESH_TOKEN,
    })

  if (!reservationId) throw new Error('reservationId required')
  if (!RESEND_API_KEY || !EMAIL_FROM || !EMAIL_TO_ADMIN) {
    throw new Error('mail_env_missing') // （解説）メールに必要なENVが無い方が致命
  }

  const client = sb()

  // 1) 予約取得
  const { data: rows, error: fetchErr } = await client
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .limit(1)
  console.log('[confirm] fetch result', { count: rows?.length ?? 0, fetchErr })
  if (fetchErr) throw new Error(`fetch_failed:${fetchErr.message}`)
  if (!rows?.length) throw new Error('not_found')

  const r = rows[0] as ReservationRow
  if (r.status !== 'pending') throw new Error(`invalid_status:${r.status}`)

  // 2) 状態更新
  const { error: updErr } = await client
    .from('reservations')
    .update({ status: 'confirmed' })
    .eq('id', reservationId)
  console.log('[confirm] update result', { updErr })
  if (updErr) throw new Error(`update_failed:${updErr.message}`)

  // 3) カレンダー（非ブロッキング）
  const eventId = await insertCalendarSilently(r)

  // 4) メール送信（ここは必ず実行）
  const resend = new Resend(RESEND_API_KEY)
  const adminRes = await resend.emails.send({
    from: EMAIL_FROM,
    to: EMAIL_TO_ADMIN,
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
  return { reservationId, calendarEventId: eventId }
}

// ===== ルート =====
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

export async function POST(req: NextRequest) {
  try {
    const { reservationId } = (await req.json()) as ConfirmBody
    console.log('[confirm][POST] hit', { reservationId })
    const result = await confirmById(reservationId)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    console.error('[confirm][POST] ERROR', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
