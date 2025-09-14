// /src/app/api/confirm/route.ts
// ------------------------------------------------------
// 予約確定API（confirm）
// ・メール内リンク → GET /api/confirm?id=...（←ここが405の原因になりがち）
// ・管理画面など → POST { reservationId }
// ・DB: 'pending' → 'confirmed'
// ・Googleカレンダー登録
// ・確定時に 管理者＆お客さま にメール送信
// ------------------------------------------------------

export const runtime = 'nodejs'           // （解説）Edge実行だとenv/SDKが不安定
export const dynamic = 'force-dynamic'    // （解説）ビルド時実行を回避

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { Resend } from 'resend'

// ===== 型定義（any禁止）=====
type ConfirmBody = { reservationId: string }
type ReservationRow = {
  id: string
  status: 'pending' | 'confirmed' | 'denied'
  date: string          // 'YYYY-MM-DD'
  start_time: string    // 'HH:MM'
  end_time: string      // 'HH:MM'
  course: string
  name: string
  tel: string | null
  email: string | null
  coupon1?: string | null
  coupon2?: string | null
  coupon3?: string | null
  notes?: string | null
}

// ===== ENV =====
const EMAIL_FROM = process.env.EMAIL_FROM || '施術屋 Luca <onboarding@resend.dev>'
const EMAIL_TO_ADMIN = process.env.EMAIL_TO_ADMIN || 'lucaverce_massage@yahoo.co.jp'
const RESEND_API_KEY = process.env.RESEND_API_KEY as string

// ===== Supabase（サービスロール）=====
function sb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

// ===== Google OAuth2（Refresh Token利用）=====
function googleAuth() {
  const client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: 'urn:ietf:wg:oauth:2.0:oob', // 未使用
  })
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return client
}

// ===== JST 'YYYY-MM-DD' + 'HH:MM' → RFC3339 =====
function toJst(date: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${date}T00:00:00+09:00`)
  d.setHours(h, m, 0, 0)
  return d.toISOString().replace('Z', '+09:00')
}

// ===== カレンダー用説明文 =====
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

// ===== 共有ロジック（idで確定処理を完遂）=====
async function confirmById(id: string) {
  if (!id) throw new Error('reservationId required')

  const client = sb()

  // 1) 取得（UUID文字列想定。Number() 変換は絶対NG）
  const { data: rows, error: fetchErr } = await client
    .from('reservations')     // ※ 複数形
    .select('*')
    .eq('id', id)
    .limit(1)

  if (fetchErr) throw new Error(`fetch_failed: ${fetchErr.message}`)
  if (!rows?.length) throw new Error('not_found')

  const r = rows[0] as ReservationRow
  if (r.status !== 'pending') throw new Error(`invalid_status:${r.status}`) // 二重確定ガード

  // 2) 更新（confirmed）
  const { error: updErr } = await client
    .from('reservations')
    .update({ status: 'confirmed' })
    .eq('id', id)
  if (updErr) throw new Error(`update_failed: ${updErr.message}`)

  // 3) Googleカレンダー登録
  const calendar = google.calendar({ version: 'v3', auth: googleAuth() })
  const calendarId = process.env.GOOGLE_CALENDAR_ID as string
  const insertRes = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `${r.name} / ${r.course}`,
      description: desc(r),
      start: { dateTime: toJst(r.date, r.start_time), timeZone: 'Asia/Tokyo' },
      end: { dateTime: toJst(r.date, r.end_time), timeZone: 'Asia/Tokyo' },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
      source: { title: 'Lucaverse Reservations', url: 'https://lucaverce.com/screen/home' },
    },
  })

  // 4) メール送信（このタイミングで初めて送る）
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY missing')
  const resend = new Resend(RESEND_API_KEY)

  await resend.emails.send({
    from: EMAIL_FROM,
    to: EMAIL_TO_ADMIN,
    subject: `予約確定：${r.date} ${r.start_time}`,
    text: adminConfirmText(r),
  })
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

// ===== GET（メール内リンク想定）=====
export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id') || ''
    const result = await confirmById(id)
    return new Response(
      `<html><body>予約を承認しました（ID: ${result.reservationId}）</body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}

// ===== POST（管理画面等からの直叩き）=====
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
