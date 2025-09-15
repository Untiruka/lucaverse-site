// /src/app/api/confirm/route.ts
// ------------------------------------------------------
// 予約確定API（Confirm）
// ・GET /api/confirm?id=...（メール内リンク）
// ・POST { reservationId }（管理UI等）
// ・DB: 'pending' → 'confirmed'
// ・Googleカレンダー登録は「非ブロッキング」（失敗しても続行）
// ・このタイミングで 管理者（TO_ADMIN）＆ユーザー にメール送信
// ------------------------------------------------------

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import { Resend } from 'resend'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ===== ENV（君のENV名に合わせる） =====
const RESEND_API_KEY = process.env.RESEND_API_KEY // （Resend）APIキー
const EMAIL_FROM = process.env.EMAIL_FROM         // （Resend）送信元（検証済みドメイン推奨）
const TO_ADMIN = process.env.TO_ADMIN             // ★管理者通知先（君のENV名）

// Supabase（サーバ用URL優先）
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_SCHEMA = process.env.SUPABASE_SCHEMA || 'public'
const RESERVATION_TABLE = process.env.RESERVATION_TABLE || 'reservation' // ★単数に合わせる

// Google Calendar（どちらか一式があれば使う／無ければスキップ）
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID
// 方式A: サービスアカウント（安定）
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
// 方式B: OAuth2 Refresh Token
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN

// ===== 型（any禁止） =====
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
  notes?: string | null
}

// ===== Supabaseクライアント生成（サービスロール／RLS越え） =====
function sb(): SupabaseClient<any, string, any> { // ← "public" 固定をやめて string 許可
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('supabase_env_missing')
  return createClient<any, string, any>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    db: { schema: SUPABASE_SCHEMA || 'public' }, // ← ENVに合わせて可変
  })
}
// ===== カレンダー認証（サービスアカウント優先 → OAuth → 無ければnull） =====
function getCalendarClient():
  | { calendar: ReturnType<typeof google.calendar>, mode: 'service' | 'oauth' }
  | null {
  if (GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    const jwt = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'), // （鍵）\nを復元
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
    return { calendar: google.calendar({ version: 'v3', auth: jwt }), mode: 'service' }
  }
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN) {
    const oauth2 = new google.auth.OAuth2({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri: 'urn:ietf:wg:oauth:2.0:oob',
    })
    oauth2.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN })
    return { calendar: google.calendar({ version: 'v3', auth: oauth2 }), mode: 'oauth' }
  }
  return null
}

// ===== JST 'YYYY-MM-DD' + 'HH:MM' → RFC3339（JST固定） =====
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

// ===== カレンダー登録（失敗してもthrowしない＝非ブロッキング） =====
async function insertCalendarSilently(r: ReservationRow): Promise<string | null> {
  if (!GOOGLE_CALENDAR_ID) return null
  const client = getCalendarClient()
  if (!client) return null
  try {
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
      },
    })
    return res.data.id ?? null
  } catch {
    return null
  }
}

// ===== 共通：確定処理 → カレンダー(非ブロック) → メール送信 =====
async function confirmById(reservationId: string) {
  if (!reservationId) throw new Error('reservationId required')
  if (!RESEND_API_KEY || !EMAIL_FROM || !TO_ADMIN) throw new Error('mail_env_missing')

  const client = sb()

  // 1) 取得（UUID/文字列IDをそのまま使う）
  const { data: rows, error: fetchErr } = await client
    .from(RESERVATION_TABLE) // ★単数テーブル名
    .select('*')
    .eq('id', reservationId)
    .limit(1)
  if (fetchErr) throw new Error(`fetch_failed:${fetchErr.message}`)
  if (!rows?.length) throw new Error('not_found')

  const r = rows[0] as ReservationRow
  if (r.status !== 'pending') throw new Error(`invalid_status:${r.status}`)

  // 2) 更新（confirmed）
  const { error: updErr } = await client
    .from(RESERVATION_TABLE)
    .update({ status: 'confirmed' })
    .eq('id', reservationId)
  if (updErr) throw new Error(`update_failed:${updErr.message}`)

  // 3) カレンダー（あれば登録。失敗しても無視）
  await insertCalendarSilently(r)

  // 4) メール送信（このタイミングで初めて送る）
  const resend = new Resend(RESEND_API_KEY)

  // 管理者（TO_ADMIN）
  await resend.emails.send({
    from: EMAIL_FROM,
    to: TO_ADMIN,
    subject: `予約確定：${r.date} ${r.start_time}`,
    text: adminConfirmText(r),
  })

  // ユーザー（予約者）
  if (r.email) {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: r.email,
      subject: '【Luca】ご予約が確定しました',
      text: userConfirmText(r),
    })
  }

  return { reservationId }
}

// ===== ルート（GET/POST両対応：405対策） =====
export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id') || ''
    await confirmById(id)
    return new Response('<html><body>予約を承認しました。</body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
export async function POST(req: NextRequest) {
  try {
    const { reservationId } = (await req.json()) as ConfirmBody
    const result = await confirmById(reservationId)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
