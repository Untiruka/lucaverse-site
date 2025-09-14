// /src/app/api/confirm/route.ts
// ------------------------------------------------------
// 予約確定API（confirm）
// ・メール内リンクの GET /api/confirm?id=... に対応（←ここ重要）
// ・POST { reservationId } にも対応（フロントから直叩き用）
// ・DB: status 'pending' → 'confirmed'
// ・Googleカレンダーに予定作成
// ・確定時に 管理者/お客さま へメール送信
// ------------------------------------------------------

export const runtime = 'nodejs'              // （用語）Edgeだとenv/SDKが不安定 → nodejs固定
export const dynamic = 'force-dynamic'       // （用語）ビルド時実行を回避

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { Resend } from 'resend'

// ====== 型定義（any禁止） ======
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

// ====== 環境変数（メール） ======
const EMAIL_FROM = process.env.EMAIL_FROM || '施術屋 Luca <onboarding@resend.dev>' // （説明）送信元
const EMAIL_TO_ADMIN = process.env.EMAIL_TO_ADMIN || 'lucaverce_massage@yahoo.co.jp' // （説明）管理者宛
const RESEND_API_KEY = process.env.RESEND_API_KEY as string                         // （説明）Resend APIキー

// ====== Supabase（サーバ・サービスロール） ======
function getSb(): SupabaseClient {
  // （説明）サービスキーを使いRLS越えで更新可能にする
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

// ====== Google OAuth2（Refresh Token 事前取得前提） ======
function getGoogleOAuth() {
  const client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: 'urn:ietf:wg:oauth:2.0:oob', // （説明）今回は使わん
  })
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return client
}

// ====== JST日時 → RFC3339 変換 ======
function toJstRfc3339(date: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${date}T00:00:00+09:00`)
  d.setHours(h, m, 0, 0)
  // （説明）末尾Zを+09:00に置換してJSTとして扱う
  return d.toISOString().replace('Z', '+09:00')
}

// ====== カレンダー説明文を整形 ======
function buildDescription(r: ReservationRow): string {
  const lines = [
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
  ].filter(Boolean)
  return lines.join('\n')
}

// ====== メール本文（確定） ======
function buildUserConfirmText(r: ReservationRow): string {
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

function buildAdminConfirmText(r: ReservationRow): string {
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

// ====== 共通本体（idで確定処理を実行） ======
async function confirmById(reservationId: string) {
  if (!reservationId) throw new Error('reservationId required')

  const sb = getSb()

  // 1) 取得
  const { data: rows, error: fetchErr } = await sb
    .from('reservations')               // （注意）テーブル名は複数形を使用
    .select('*')
    .eq('id', reservationId)
    .limit(1)

  if (fetchErr) throw new Error(`fetch_failed: ${fetchErr.message}`)
  if (!rows || rows.length === 0) throw new Error('not_found')

  const r = rows[0] as ReservationRow
  if (r.status !== 'pending') {
    // （説明）二重確定を防止
    throw new Error(`invalid_status:${r.status}`)
  }

  // 2) 更新（confirmed）
  const { error: updErr } = await sb
    .from('reservations')
    .update({ status: 'confirmed' })
    .eq('id', reservationId)

  if (updErr) throw new Error(`update_failed: ${updErr.message}`)

  // 3) Googleカレンダーへ登録
  const auth = getGoogleOAuth()
  const calendar = google.calendar({ version: 'v3', auth })
  const calendarId = process.env.GOOGLE_CALENDAR_ID as string
  const summary = `${r.name} / ${r.course}`
  const description = buildDescription(r)
  const start = toJstRfc3339(r.date, r.start_time)
  const end = toJstRfc3339(r.date, r.end_time)

  const insertRes = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      start: { dateTime: start, timeZone: 'Asia/Tokyo' },
      end: { dateTime: end, timeZone: 'Asia/Tokyo' },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
      source: { title: 'Lucaverse Reservations', url: 'https://lucaverce.com/screen/home' },
    },
  })

  // 4) メール送信（このタイミングで初めて送る）
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY missing')
  const resend = new Resend(RESEND_API_KEY)

  // 管理者
  await resend.emails.send({
    from: EMAIL_FROM,
    to: EMAIL_TO_ADMIN,
    subject: `予約確定：${r.date} ${r.start_time}`,
    text: buildAdminConfirmText(r),
  })

  // ユーザー
  if (r.email) {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: r.email,
      subject: '【Luca】ご予約が確定しました',
      text: buildUserConfirmText(r),
    })
  }

  return { reservationId, calendarEventId: insertRes.data.id ?? null }
}

// ====== GET（メール内リンク用） ======
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id') || ''        // （説明）UUID/文字列をそのまま使う
    const result = await confirmById(id)

    // （説明）承認完了の簡易ページを返す（ブラウザ直アクセス向け）
    const okHtml = `<html><body>予約を承認しました（ID: ${result.reservationId}）</body></html>`
    return new Response(okHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}

// ====== POST（フロントからの直接確定用） ======
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const { reservationId } = (body as ConfirmBody)
    const result = await confirmById(reservationId)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
