// /src/app/api/confirm/route.ts
// ------------------------------------------------------
// 予約確定（Confirm）
// ・GET /api/confirm?id=...（メール内リンク想定）
// ・POST { reservationId }（管理UI想定）
// ・DB: pending → confirmed
// ・Googleカレンダー登録
// ・このタイミングで初めて ユーザー にもメール送信
// ------------------------------------------------------

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
// ★ 型は type でimport（型だけ拾う最適解）
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { Resend } from 'resend'

// ====== 型定義 ======
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
}

// ====== ENV（メール/カレンダー） ======
const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || '施術屋 Luca <onboarding@resend.dev>'
const EMAIL_TO_ADMIN = process.env.EMAIL_TO_ADMIN || 'lucaverce_massage@yahoo.co.jp'
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary' // （補足）未設定ならprimaryを使う

// ====== ENV（DB）—— 単数テーブルが正やからデフォは 'reservation' ======
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string
const RESERVATION_TABLE = process.env.RESERVATION_TABLE || 'reservation' // ← ★ここがキモ

// ====== Supabase（サーバ用・サービスロール） ======
function sb(): SupabaseClient {
  // （補足）auth.persistSession:false：サーバでセッション保持しない（安全）
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

// ====== Google OAuth2（Refresh Token 方式） ======
function googleAuth() {
  const client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: 'urn:ietf:wg:oauth:2.0:oob', // 今回未使用
  })
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return client
}

// ====== JST 'YYYY-MM-DD' + 'HH:MM' → RFC3339（JST固定） ======
function toJst(date: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${date}T00:00:00+09:00`)
  d.setHours(h, m, 0, 0)
  return d.toISOString().replace('Z', '+09:00')
}

// ====== メール本文 ======
function userConfirmText(r: ReservationRow) {
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

function adminConfirmText(r: ReservationRow) {
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

// ====== 共通処理：idで確定＋メール送信 ======
async function confirmById(reservationId: string) {
  console.log('[confirm] START', { reservationId, table: RESERVATION_TABLE })
  console.log('[confirm] ENV', {
    RESEND_API_KEY: !!RESEND_API_KEY,
    EMAIL_FROM: !!EMAIL_FROM,
    EMAIL_TO_ADMIN: !!EMAIL_TO_ADMIN,
    GOOGLE_CALENDAR_ID: !!GOOGLE_CALENDAR_ID,
    NEXT_PUBLIC_SUPABASE_URL: !!SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
  })

  if (!reservationId) throw new Error('reservationId required')
  if (!RESEND_API_KEY || !EMAIL_FROM || !EMAIL_TO_ADMIN || !GOOGLE_CALENDAR_ID) throw new Error('env_missing')

  const client = sb()

  // 1) 取得（★テーブル名はENVのRESERVATION_TABLE）
  const { data: rows, error: fetchErr } = await client
    .from(RESERVATION_TABLE)
    .select('*')
    .eq('id', reservationId)
    .limit(1)
  console.log('[confirm] fetch', { count: rows?.length ?? 0, fetchErr })
  if (fetchErr) throw new Error(`fetch_failed:${fetchErr.message}`)
  if (!rows?.length) throw new Error('not_found')

  const r = rows[0] as ReservationRow
  console.log('[confirm] row', { id: r.id, status: r.status, email: r.email })
  if (r.status !== 'pending') throw new Error(`invalid_status:${r.status}`)

  // 2) 更新（confirmed）
  const { error: updErr } = await client
    .from(RESERVATION_TABLE)
    .update({ status: 'confirmed' })
    .eq('id', reservationId)
  console.log('[confirm] update', { updErr })
  if (updErr) throw new Error(`update_failed:${updErr.message}`)

  // 3) カレンダー登録
  const calendar = google.calendar({ version: 'v3', auth: googleAuth() })
  const insertRes = await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID, // （用語）カレンダーID（primaryでもOK）
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
  console.log('[confirm] calendar', { eventId: insertRes.data.id })

  // 4) メール送信（この段階で初送信）
  const resend = new Resend(RESEND_API_KEY)

  const adminRes = await resend.emails.send({
    from: EMAIL_FROM,
    to: EMAIL_TO_ADMIN,
    subject: `予約確定：${r.date} ${r.start_time}`,
    text: adminConfirmText(r),
  })
  console.log('[confirm] admin email', { data: adminRes?.data, error: adminRes?.error })

  if (r.email) {
    const userRes = await resend.emails.send({
      from: EMAIL_FROM,
      to: r.email,
      subject: '【Luca】ご予約が確定しました',
      text: userConfirmText(r),
    })
    console.log('[confirm] user email', { data: userRes?.data, error: userRes?.error })
  } else {
    console.warn('[confirm] user email skipped (no email)')
  }

  console.log('[confirm] DONE')
}

// ====== GET（メール内リンク） ======
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

// ====== POST（管理UI） ======
export async function POST(req: NextRequest) {
  try {
    const { reservationId } = (await req.json()) as ConfirmBody
    console.log('[confirm][POST] hit', { reservationId })
    await confirmById(reservationId)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    console.error('[confirm][POST] ERROR', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
