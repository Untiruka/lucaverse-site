// app/api/confirm/route.ts
// ------------------------------------------------------
// 予約の最終確定API：pending → confirmed に更新し、Googleカレンダーへ予定を作成
// - 入力: POST JSON { reservationId: string }
// - 前提: DBのreservationsテーブルに status='pending' の行が存在
// - Google カレンダー: OAuth2（保存済みのRefresh Tokenを使用）で events.insert
// ------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js' // ← サーバサイド用に生成
import { google } from 'googleapis'
export const runtime = 'nodejs'

// 型（any禁止）
type ConfirmBody = {
  reservationId: string
}

// 予約テーブルの型（必要項目のみ想定。足りなければ拡張）
type ReservationRow = {
  id: string
  status: 'pending' | 'confirmed' | 'denied'
  date: string            // 'YYYY-MM-DD'
  start_time: string      // 'HH:MM'
  end_time: string        // 'HH:MM'
  course: string          // '30min' | '60min' | '90min' など
  name: string
  tel: string | null
  email: string | null
  coupon1?: string | null
  coupon2?: string | null
  coupon3?: string | null
  notes?: string | null
}

// Supabase（サーバ）クライアント生成（サービスキーでRLS越え・更新可）
// ※ 必要に応じて自作の getSupabaseServer() に置き換えOK
function getSb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

// Google OAuth2 クライアント（事前にRefresh Tokenを環境変数に）
function getGoogleOAuth() {
  const client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: 'urn:ietf:wg:oauth:2.0:oob', // 使わない（Refresh Token直指定）
  })
  client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN, // 取得済みのRTを設定
  })
  return client
}

// 日付+時刻（JST）→ RFC3339（タイムゾーン付き）
// 例: ('2025-09-12','15:00') → '2025-09-12T15:00:00+09:00'
function toJstRfc3339(date: string, hhmm: string): string {
  // ※ 簡易生成：JST固定（サーバがどこでも安全）
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${date}T00:00:00+09:00`)
  d.setHours(h, m, 0, 0)
  return d.toISOString().replace('Z', '+09:00')
}

// 予約内容→Googleカレンダーの説明欄に整形
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

export async function POST(req: NextRequest) {
  try {
    // ---------- 1) 入力取得 & バリデーション ----------
    const body: unknown = await req.json()
    const { reservationId } = (body as ConfirmBody)
    if (!reservationId) {
      return NextResponse.json({ ok: false, error: 'reservationId is required' }, { status: 400 })
    }

    // ---------- 2) 予約の取得（pending限定） ----------
    const sb = getSb()
    const { data: rows, error: fetchErr } = await sb
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .limit(1)

    if (fetchErr) {
      // ※ DBエラー（postgrestの詳細をそのまま返す）
      return NextResponse.json({ ok: false, error: 'fetch_failed', details: fetchErr }, { status: 500 })
    }
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    }

    const r = rows[0] as ReservationRow
    if (r.status !== 'pending') {
      // 二重確定ガード（状態がpending以外なら何もしない）
      return NextResponse.json({ ok: false, error: `invalid_status:${r.status}` }, { status: 409 })
    }

    // ---------- 3) 状態を confirmed に更新（トランザクション代替：順序保証） ----------
    const { error: updErr } = await sb
      .from('reservations')
      .update({ status: 'confirmed' })
      .eq('id', reservationId)

    if (updErr) {
      return NextResponse.json({ ok: false, error: 'update_failed', details: updErr }, { status: 500 })
    }

    // ---------- 4) Google カレンダーへ予定作成 ----------
    const auth = getGoogleOAuth()
    const calendar = google.calendar({ version: 'v3', auth })

    const calendarId = process.env.GOOGLE_CALENDAR_ID as string // 追加先のカレンダーID
    const summary = `${r.name} / ${r.course}` // タイトル：氏名 / コース
    const description = buildDescription(r)
    const start = toJstRfc3339(r.date, r.start_time)
    const end = toJstRfc3339(r.date, r.end_time)

    // イベント挿入（timeZoneはAsia/Tokyoを明示）
    const insertRes = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description,
        start: { dateTime: start, timeZone: 'Asia/Tokyo' },
        end: { dateTime: end, timeZone: 'Asia/Tokyo' },
        // あると便利なメタ（通知：30分前など）
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 30 }],
        },
        // 予約の識別用（あとで消したい時に使える）
        source: { title: 'Lucaverse Reservations', url: 'https://lucaverce.com/screen/home' },
      },
    })

    return NextResponse.json({
      ok: true,
      reservationId,
      calendarEventId: insertRes.data.id ?? null,
    })
  } catch (e: unknown) {
    // 例外はunknownで受け、Errorの場合のみmessageを返す（TypeScriptの基本）
    if (e instanceof Error) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
    }
    return NextResponse.json({ ok: false, error: 'unknown_error' }, { status: 500 })
  }
}
