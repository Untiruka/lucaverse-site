// /src/app/api/confirm/route.ts
// ------------------------------------------------------
// 予約確定API（Confirm）
// ・メール内リンクの GET /api/confirm?id=... に対応（405対策）
// ・管理画面などの POST { reservationId } にも対応
// ・DB: 'pending' → 'confirmed'（状態遷移）
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
}

// === ENV（必須） ===
const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || '施術屋 Luca <onboarding@resend.dev>'
const EMAIL_TO_ADMIN = process.env.EMAIL_TO_ADMIN || 'lucaverce_massage@yahoo.co.jp'
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID

function sb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string // （サービスロール）RLS越え
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

function googleAuth() {
  const client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: 'urn:ietf:wg:oauth:2.0:oob', // 未使用
  })
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return client
}

function toJst(date: string, hhmm: string): string {
  // （JST→RFC3339）サーバ場所に依らずJST固定で扱う
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${date}T00:00:00+09:00`)
  d.setHours(h, m, 0, 0)
  return d.toISOString().replace('Z', '+09:00')
}

// --- メール本文（ユーザー：確定通知）---
// 元の userText を踏襲しつつ、「確定しました」を明示。
// map/cancel リンクは要件にないので省略（必要なら後で足せる）。
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
// 元の adminText ベース。ただし承認/拒否リンクは不要化（確定済みやから）。
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

// --- 共通：確定処理＋送信 ---
async function confirmById(id: string) {
  if (!id) throw new Error('reservationId required')
  if (!RESEND_API_KEY || !EMAIL_FROM || !EMAIL_TO_ADMIN || !GOOGLE_CALENDAR_ID) {
    throw new Error('env_missing')
  }

  const client = sb()

  // 1) 予約取得（UUID文字列をそのまま使用：Number変換は禁止）
  const { data: rows, error: fetchErr } = await client
    .from('reservations') // ※ テーブルは複数形
    .select('*')
    .eq('id', id)
    .limit(1)
  if (fetchErr) throw new Error(`fetch_failed:${fetchErr.message}`)
  if (!rows?.length) throw new Error('not_found')

  const r = rows[0] as ReservationRow
  if (r.status !== 'pending') throw new Error(`invalid_status:${r.status}`) // 二重確定ガード

  // 2) 状態更新（confirmed）
  const { error: updErr } = await client
    .from('reservations')
    .update({ status: 'confirmed' })
    .eq('id', id)
  if (updErr) throw new Error(`update_failed:${updErr.message}`)

  // 3) Googleカレンダー登録
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

  // 4) メール送信（このタイミングで初めて送る）
  const resend = new Resend(RESEND_API_KEY)

  // 管理者
  await resend.emails.send({
    from: EMAIL_FROM,
    to: EMAIL_TO_ADMIN,
    subject: `予約確定：${r.date} ${r.start_time}`,
    text: adminConfirmText(r),
  })

  // ユーザー
  if (r.email) {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: r.email,
      subject: '【Luca】ご予約が確定しました',
      text: userConfirmText(r),
    })
  }

  return { reservationId: id, calendarEventId: insertRes.data.id ?? null }
}

// --- GET（メール内の承認リンク想定）---
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

// --- POST（管理UIなどからの確定）---
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
